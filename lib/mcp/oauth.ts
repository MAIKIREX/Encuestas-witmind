import "server-only";

import { SITE_URL } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

// Supabase Auth actua como servidor de autorizacion OAuth 2.1 (registro dinamico
// de clientes, PKCE, emision de tokens). Esta app solo es el "resource server":
// publica su metadata, muestra el consentimiento y valida los access tokens.
export function authorizationServerUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "")}/auth/v1`;
}

// Origen publico (siempre https fuera de local) para que Claude acepte las URLs.
export function publicOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return SITE_URL;
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  return `${isLocal ? "http" : "https"}://${host}`;
}

export const MCP_PATH = "/api/mcp";
export const RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_PATH}`;

// Valida un access token emitido por Supabase Auth y exige rol admin: los datos
// que expone el MCP (resultados de todos los candidatos) son solo para admins.
export async function isAdminAccessToken(token: string) {
  const db = createServiceClient();
  const { data, error } = await db.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return false;

  const { data: role } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(role);
}
