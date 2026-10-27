"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

// Decision del consentimiento OAuth (conector MCP de claude.ai). Supabase Auth
// genera el codigo de autorizacion y devuelve la URL de retorno del cliente.
export async function decideOAuthAuthorization(formData: FormData) {
  const authorizationId = String(formData.get("authorization_id") ?? "");
  const approve = formData.get("decision") === "approve";
  if (!authorizationId) throw new Error("Falta authorization_id.");

  // Solo un administrador puede conceder acceso; cualquiera puede rechazar.
  if (approve) await requireAdmin();

  const supabase = await createClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });

  if (error || !data?.redirect_url) {
    throw new Error(error?.message ?? "No se pudo completar la autorización.");
  }
  redirect(data.redirect_url);
}
