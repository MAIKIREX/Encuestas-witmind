import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Database, ItemConfig } from "../lib/supabase/types";

// Segunda pasada del Wonderlic (Formulario A): los items 7, 38, 42 y 49
// dependen de figuras y se omitieron en scripts/import-wonderlic.ts.
//
// Las imagenes y la geometria salen de scripts/extract-wonderlic-figures.py
// (carpeta wonderlic-import/). Las claves vienen de la hoja de correccion:
//   7 -> alternativa 3 | 38 -> 6;9 | 42 -> 3;22 | 49 -> 2,3,4,5
//
// Los items interactivos (38, 42, 49) se guardan como `free_response`: el
// cliente envia siempre la respuesta canonica ("6,9", "2,3,4,5") y el servidor
// la compara contra la clave igual que cualquier respuesta abierta. La imagen
// raster es solo respaldo para clientes que no conozcan `config`.

type FigureDatabase = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      test_items: {
        Row: { id: string; test_id: string; stem: string; config: ItemConfig };
        Insert: { id?: string; test_id: string; stem: string; config?: ItemConfig };
        Update: Partial<{ id: string; test_id: string; stem: string; config: ItemConfig }>;
        Relationships: [];
      };
    };
  };
};
type ServiceClient = SupabaseClient<FigureDatabase>;

const BUCKET = "test-media";
const TEST_SLUG = "wonderlic-formulario-a";
const INPUT = path.resolve("wonderlic-import");
const MEDIA_ROOT = TEST_SLUG;

type Figures = {
  "38": Required<Pick<ItemConfig, "viewBox" | "points">>;
  "42": Required<Pick<ItemConfig, "viewBox" | "points">>;
  "49": { cell: [number, number]; pieces: NonNullable<ItemConfig["pieces"]> };
};

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

// Variantes tecleables para clientes sin el widget (respaldo): cualquier orden,
// separadas por coma o espacio.
function typedVariants(numbers: number[]) {
  return permutations(numbers).flatMap((order) => [order.join(","), order.join(" ")]);
}

async function upload(db: ServiceClient, localPath: string, remotePath: string) {
  const { error } = await db.storage.from(BUCKET).upload(remotePath, await fs.readFile(localPath), {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir ${path.basename(localPath)}: ${error.message}`);
  return remotePath;
}

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  const db = createClient<FigureDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const figures = JSON.parse(await fs.readFile(path.join(INPUT, "figures.json"), "utf8")) as Figures;

  const { data: test, error: testError } = await db.from("tests").select("id").eq("slug", TEST_SLUG).maybeSingle();
  if (testError || !test) throw new Error(`No se encontró la prueba ${TEST_SLUG}: ${testError?.message ?? "sin datos"}`);
  const testId = test.id as string;

  const { data: saved, error: savedError } = await db.from("test_items").select("id, stem").eq("test_id", testId);
  if (savedError) throw new Error(`No se pudieron consultar los ítems: ${savedError.message}`);
  const idByStem = new Map((saved ?? []).map((item) => [item.stem, item.id]));

  type Draft = {
    code: number;
    stem: string;
    media: string;
    config: ItemConfig;
    save: (itemId: string | null, mediaPath: string) => Promise<string>;
  };

  async function upsertFree(code: number, stem: string, accepted: string[], itemId: string | null, mediaPath: string) {
    const { data, error } = await db.rpc("admin_upsert_item", {
      p_test_id: testId,
      p_item_id: itemId,
      p_stem: stem,
      p_item_type: "free_response",
      p_subscale_id: null,
      p_is_reverse: false,
      p_media_url: mediaPath,
      p_options: [],
      p_answer_key: { accepted, points: 1 },
    });
    if (error) throw new Error(`${code}: ${error.message}`);
    return data as string;
  }

  const drafts: Draft[] = [
    {
      code: 7,
      stem: "7. ¿Cuál figura puede formarse con estas dos partes?",
      media: "7/stem.png",
      config: { numberOptions: true, mediaRatio: "130/74" },
      save: async (itemId, mediaPath) => {
        const optionPaths: string[] = [];
        for (let n = 1; n <= 5; n++) {
          optionPaths.push(await upload(db, path.join(INPUT, "7", `option-${n}.png`), `${MEDIA_ROOT}/7/option-${n}.png`));
        }
        const { data, error } = await db.rpc("admin_upsert_item", {
          p_test_id: testId,
          p_item_id: itemId,
          p_stem: "7. ¿Cuál figura puede formarse con estas dos partes?",
          p_item_type: "mcq_image",
          p_subscale_id: null,
          p_is_reverse: false,
          p_media_url: mediaPath,
          p_options: optionPaths.map((media_url, i) => ({
            code: String.fromCharCode(97 + i),
            label: `Figura ${i + 1}`,
            display_order: i + 1,
            is_correct: i + 1 === 3,
            points: i + 1 === 3 ? 1 : 0,
            media_url,
          })),
        });
        if (error) throw new Error(`7: ${error.message}`);
        return data as string;
      },
    },
    {
      code: 38,
      stem: "38. Esta figura geométrica puede dividirse con una línea recta en dos partes que, unidas de cierta manera, forman un cuadrado perfecto. Traza esa línea uniendo dos de los números.",
      media: "38/stem.png",
      config: { interaction: "line_trace", ...figures["38"] },
      save: (itemId, mediaPath) =>
        upsertFree(38, "38. Esta figura geométrica puede dividirse con una línea recta en dos partes que, unidas de cierta manera, forman un cuadrado perfecto. Traza esa línea uniendo dos de los números.", ["6,9", "9,6", "6 9", "9 6", "6;9", "9;6"], itemId, mediaPath),
    },
    {
      code: 42,
      stem: "42. Esta figura geométrica puede dividirse con una línea recta en dos partes que, unidas de cierta manera, forman un cuadrado perfecto. Traza esa línea uniendo dos de los números.",
      media: "42/stem.png",
      config: { interaction: "line_trace", ...figures["42"] },
      save: (itemId, mediaPath) =>
        upsertFree(42, "42. Esta figura geométrica puede dividirse con una línea recta en dos partes que, unidas de cierta manera, forman un cuadrado perfecto. Traza esa línea uniendo dos de los números.", ["3,22", "22,3", "3 22", "22 3", "3;22", "22;3"], itemId, mediaPath),
    },
    {
      code: 49,
      stem: "49. Cuatro de las cinco piezas pueden unirse para formar un triángulo. ¿Cuáles son? Marca las cuatro piezas.",
      media: "49/stem.png",
      config: { interaction: "pick_pieces", pick: 4, ...figures["49"] },
      save: (itemId, mediaPath) =>
        upsertFree(49, "49. Cuatro de las cinco piezas pueden unirse para formar un triángulo. ¿Cuáles son? Marca las cuatro piezas.", typedVariants([2, 3, 4, 5]), itemId, mediaPath),
    },
  ];

  let completed = 0;
  for (const draft of drafts) {
    try {
      const mediaPath = await upload(db, path.join(INPUT, draft.media), `${MEDIA_ROOT}/${draft.media}`);
      const itemId = await draft.save(idByStem.get(draft.stem) ?? null, mediaPath);
      const { error } = await db.from("test_items").update({ config: draft.config }).eq("id", itemId);
      if (error) throw new Error(`config: ${error.message}`);
      completed += 1;
      console.log(`✓ ${draft.code}`);
    } catch (error) {
      console.error(`✗ ${draft.code}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
  console.log(`\nResumen: ${completed}/${drafts.length} ítems importados.`);
  console.log("Recuerda reordenar `position` según el número del enunciado (ver README del importador).");
}

main().catch((error) => {
  console.error(`Importación cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
