"use server";

import { randomUUID } from "node:crypto";

import { requireAdmin } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "test-media";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Sube el estimulo (lamina o alternativa) de un item de imagen al bucket
// privado. Se guarda solo el "path" en la base de datos; la URL firmada se
// genera bajo demanda para admin (preview) y candidatos (get_attempt_state).
export async function uploadItemMedia(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Selecciona un archivo." };

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { error: "Formato no soportado. Usa PNG, JPG o WebP." };
  if (file.size > MAX_BYTES) return { error: "La imagen no puede superar 5 MB." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno." };
  }

  const path = `items/${randomUUID()}.${ext}`;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) return { error: "No se pudo subir la imagen." };
    return { path };
  } catch {
    return { error: "Error de configuración al conectar con el servicio de almacenamiento." };
  }
}

export async function getMediaPreviewUrl(path: string) {
  await requireAdmin();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno." };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error || !data) return { error: "No se pudo generar la vista previa." };
    return { url: data.signedUrl };
  } catch {
    return { error: "Error al generar la vista previa." };
  }
}

async function signPaths(paths: string[]) {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return {} as Record<string, string>;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[media.ts] SUPABASE_SERVICE_ROLE_KEY no está configurada. Las imágenes no se podrán visualizar hasta agregar la variable en .env.",
    );
    return {} as Record<string, string>;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
    if (error || !data) return {} as Record<string, string>;

    const map: Record<string, string> = {};
    for (const entry of data) {
      if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
    }
    return map;
  } catch (err) {
    console.error("[media.ts] Error al firmar paths de medios:", err);
    return {} as Record<string, string>;
  }
}

// Firma en lote los `media_url` (paths del bucket) que llegan en el estado de
// un intento, para que el runner del candidato reciba URLs ya utilizables.
// No requiere admin: la llama el propio servidor al armar la pagina del
// intento, que ya valido que el intento pertenece al candidato autenticado.
export async function signAttemptMediaPaths(paths: string[]) {
  return signPaths(paths);
}

// Igual que la anterior, pero para el banco de preguntas del admin: firma de
// una sola vez todas las laminas/alternativas de un test en vez de que cada
// miniatura pida su propia URL (eso era lo que hacia lenta la carga con
// pruebas de imagenes grandes como Raven, con cientos de miniaturas).
export async function signAdminMediaPaths(paths: string[]) {
  await requireAdmin();
  return signPaths(paths);
}
