import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/service";

const TOKEN_PREFIX = "mcp_";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Token de alta entropia (256 bits): el hash SHA-256 sin sal es suficiente.
export function generateToken() {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) };
}

function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function equalsEnvToken(provided: string, envToken: string) {
  // Se comparan hashes para que timingSafeEqual reciba buffers del mismo largo.
  return timingSafeEqual(
    Buffer.from(hashToken(provided), "hex"),
    Buffer.from(hashToken(envToken), "hex"),
  );
}

// Acepta el token de respaldo MCP_API_TOKEN (Coolify) o un token activo de la
// tabla `mcp_tokens` creado desde Admin → MCP.
export async function isAuthorizedMcpRequest(request: Request) {
  const provided = bearer(request);
  if (!provided) return false;

  const envToken = process.env.MCP_API_TOKEN;
  if (envToken && equalsEnvToken(provided, envToken)) return true;

  if (!provided.startsWith(TOKEN_PREFIX)) return false;

  const db = createServiceClient();
  const { data, error } = await db
    .from("mcp_tokens")
    .select("id")
    .eq("token_hash", hashToken(provided))
    .is("revoked_at", null)
    .maybeSingle();
  // Si la tabla aun no existe (migracion pendiente) solo vale el token de Coolify.
  if (error || !data) return false;

  await db.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}
