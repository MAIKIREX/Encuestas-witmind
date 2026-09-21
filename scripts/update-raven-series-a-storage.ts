import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const BUCKET = "test-media";
const INPUT_DIRECTORY = path.resolve("raven-import");
const MIME_TYPE = "image/png";

function sourcePath(code: string, option: number) {
  return path.join(INPUT_DIRECTORY, `${code}_opt_${option}.png`);
}

function destinationPath(code: string, option: number) {
  return `raven-escala-general/${code}/option-${option}.png`;
}

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  }

  const files = Array.from({ length: 12 }, (_, index) => `A${String(index + 1).padStart(2, "0")}`).flatMap((code) =>
    Array.from({ length: 6 }, (_, index) => ({ code, option: index + 1 })),
  );

  for (const file of files) {
    const localPath = sourcePath(file.code, file.option);
    if (!existsSync(localPath)) throw new Error(`Falta ${localPath}. No se realizó ninguna subida.`);
  }

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const failures: string[] = [];
  for (const file of files) {
    const localPath = sourcePath(file.code, file.option);
    const destination = destinationPath(file.code, file.option);
    const { error } = await db.storage.from(BUCKET).upload(destination, await fs.readFile(localPath), {
      contentType: MIME_TYPE,
      upsert: true,
    });
    if (error) {
      failures.push(`${destination}: ${error.message}`);
      console.error(`✗ ${destination}: ${error.message}`);
    } else {
      console.log(`✓ ${destination}`);
    }
  }

  console.log(`Resumen: ${files.length - failures.length}/${files.length} objetos actualizados.`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Actualización cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
