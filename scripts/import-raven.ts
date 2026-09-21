import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Database } from "../lib/supabase/types";

// `test_items` no se expone aún en los tipos generados de la aplicación, pero
// sí existe en la base de datos y es necesario para que el proceso sea reanudable.
// Las opciones/puntajes (esquema `scoring`, no expuesto por PostgREST) se
// escriben via `admin_upsert_item`, que corre server-side con permisos propios.
type RavenDatabase = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      test_items: {
        Row: { id: string; test_id: string; stem: string };
        Insert: { id?: string; test_id: string; stem: string };
        Update: Partial<{ id: string; test_id: string; stem: string }>;
        Relationships: [];
      };
    };
  };
};
type ServiceClient = SupabaseClient<RavenDatabase>;

const BUCKET = "test-media";
const TEST_SLUG = "raven-escala-general";
const TEST_NAME = "Raven — Escala General";
const STEM_PREFIX = "Raven — Escala General · ";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

type RavenItem = {
  code: string;
  stemPath: string;
  optionPaths: string[];
  correctOption: number;
};

function expectedCodes() {
  return ["A", "B", "C", "D", "E"].flatMap((series) =>
    Array.from({ length: 12 }, (_, index) => `${series}${String(index + 1).padStart(2, "0")}`),
  );
}

function inputDirectory() {
  const flagIndex = process.argv.indexOf("--input");
  if (flagIndex !== -1 && !process.argv[flagIndex + 1]) {
    throw new Error("Falta la ruta después de --input.");
  }
  return path.resolve(flagIndex === -1 ? "raven-import" : process.argv[flagIndex + 1]);
}

function mediaPath(code: string, kind: "stem" | "option", sourcePath: string) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (kind === "stem") return `raven-escala-general/${code}/stem${extension}`;

  const optionNumber = path.basename(sourcePath).match(/_opt_(\d+)\./i)?.[1];
  if (!optionNumber) throw new Error(`No se pudo determinar el número de ${path.basename(sourcePath)}.`);
  return `raven-escala-general/${code}/option-${optionNumber}${extension}`;
}

async function assertImage(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (!MIME_BY_EXTENSION[extension]) {
    throw new Error(`${path.basename(filePath)} tiene formato no soportado. Usa PNG, JPG o WebP.`);
  }
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_BYTES) {
    throw new Error(`${path.basename(filePath)} supera el límite de 5 MB.`);
  }
}

async function readItems(directory: string): Promise<RavenItem[]> {
  const keyPath = path.join(directory, "clave.json");
  if (!existsSync(keyPath)) throw new Error(`No se encontró ${keyPath}.`);

  let key: Record<string, unknown>;
  try {
    key = JSON.parse(await fs.readFile(keyPath, "utf8"));
  } catch {
    throw new Error("clave.json no contiene JSON válido.");
  }
  if (!key || Array.isArray(key) || typeof key !== "object") {
    throw new Error("clave.json debe ser un objeto con las claves A01…E12.");
  }

  const expected = expectedCodes();
  const unexpectedKeys = Object.keys(key).filter((code) => !expected.includes(code));
  const missingKeys = expected.filter((code) => !(code in key));
  if (unexpectedKeys.length || missingKeys.length) {
    throw new Error(
      `La clave debe contener exactamente 60 ítems. Faltan: ${missingKeys.join(", ") || "ninguno"}. ` +
        `Sobran: ${unexpectedKeys.join(", ") || "ninguno"}.`,
    );
  }

  const files = await fs.readdir(directory);
  return Promise.all(
    expected.map(async (code) => {
      const stemName = files.find((file) => new RegExp(`^${code}_stem\\.(png|jpe?g|webp)$`, "i").test(file));
      if (!stemName) throw new Error(`${code}: falta ${code}_stem.(png|jpg|webp).`);

      const options = files
        .map((file) => ({ file, match: file.match(new RegExp(`^${code}_opt_(\\d+)\\.(png|jpe?g|webp)$`, "i")) }))
        .filter((entry): entry is { file: string; match: RegExpMatchArray } => Boolean(entry.match))
        .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
      if (options.length < 2) throw new Error(`${code}: se requieren al menos dos alternativas.`);
      if (options.some((option, index) => Number(option.match[1]) !== index + 1)) {
        throw new Error(`${code}: las alternativas deben ser consecutivas, desde _opt_1.`);
      }

      const correctOption = key[code];
      if (
        typeof correctOption !== "number" ||
        !Number.isInteger(correctOption) ||
        correctOption < 1 ||
        correctOption > options.length
      ) {
        throw new Error(`${code}: la clave debe ser una alternativa existente (1–${options.length}).`);
      }

      const stemPath = path.join(directory, stemName);
      const optionPaths = options.map((option) => path.join(directory, option.file));
      await Promise.all([assertImage(stemPath), ...optionPaths.map(assertImage)]);
      return { code, stemPath, optionPaths, correctOption: correctOption as number };
    }),
  );
}

async function upload(db: ServiceClient, sourcePath: string, destinationPath: string) {
  const extension = path.extname(sourcePath).toLowerCase();
  const { error } = await db.storage.from(BUCKET).upload(destinationPath, await fs.readFile(sourcePath), {
    contentType: MIME_BY_EXTENSION[extension],
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir ${path.basename(sourcePath)}: ${error.message}`);
  return destinationPath;
}

async function getOrCreateTest(db: ServiceClient) {
  const { data: existing, error: searchError } = await db
    .from("tests")
    .select("id, scoring_strategy, source")
    .eq("slug", TEST_SLUG)
    .maybeSingle();
  if (searchError) throw new Error(`No se pudo buscar la prueba: ${searchError.message}`);
  if (existing) {
    if (existing.scoring_strategy !== "key_sum" || existing.source !== "seed_licensed") {
      throw new Error(`Ya existe ${TEST_SLUG}, pero su configuración no corresponde al importador.`);
    }
    return existing.id as string;
  }

  const { data: created, error: createError } = await db
    .from("tests")
    .insert({
      slug: TEST_SLUG,
      name: TEST_NAME,
      description: "Matrices progresivas de Raven — Escala General.",
      instructions: "Seleccione la alternativa que completa correctamente cada matriz.",
      source: "seed_licensed",
      scoring_strategy: "key_sum",
      scoring_config: {},
      is_timed: false,
      shuffle_items: false,
      shuffle_options: false,
      is_active: false,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(`No se pudo crear la prueba: ${createError?.message ?? "sin respuesta"}`);
  return created.id as string;
}

async function main() {
  loadEnvConfig(process.cwd());
  const directory = inputDirectory();
  if (!existsSync(directory)) throw new Error(`No existe la carpeta de importación: ${directory}`);
  const items = await readItems(directory);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  const db = createClient<RavenDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const testId = await getOrCreateTest(db);

  const { data: savedItems, error: savedItemsError } = await db
    .from("test_items")
    .select("id, stem")
    .eq("test_id", testId);
  if (savedItemsError) throw new Error(`No se pudieron consultar los ítems existentes: ${savedItemsError.message}`);
  const itemIdByStem = new Map((savedItems ?? []).map((item: { id: string; stem: string }) => [item.stem, item.id]));

  let completed = 0;
  const failures: string[] = [];
  for (const item of items) {
    try {
      const stemMediaPath = await upload(db, item.stemPath, mediaPath(item.code, "stem", item.stemPath));
      const optionMediaPaths = await Promise.all(
        item.optionPaths.map((optionPath) => upload(db, optionPath, mediaPath(item.code, "option", optionPath))),
      );
      const stem = `${STEM_PREFIX}${item.code}`;
      const { error } = await db.rpc("admin_upsert_item", {
        p_test_id: testId,
        p_item_id: itemIdByStem.get(stem) ?? null,
        p_stem: stem,
        p_item_type: "mcq_image",
        p_subscale_id: null,
        p_is_reverse: false,
        p_media_url: stemMediaPath,
        p_options: optionMediaPaths.map((media_url, index) => ({
          code: String.fromCharCode(97 + index),
          label: `Alternativa ${index + 1}`,
          display_order: index + 1,
          is_correct: index + 1 === item.correctOption,
          points: index + 1 === item.correctOption ? 1 : 0,
          media_url,
        })),
      });
      if (error) throw new Error(error.message);
      completed += 1;
      console.log(`✓ ${item.code}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.code}: ${message}`);
      console.error(`✗ ${item.code}: ${message}`);
    }
  }

  console.log(`\nResumen: ${completed}/60 ítems importados; ${failures.length} con error.`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Importación cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
