"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/dal";
import { generateToken } from "@/lib/mcp/auth";
import { createClient } from "@/lib/supabase/server";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Ponle un nombre al token (ej. «Claude Code de Miguel»).")
  .max(80, "El nombre no puede pasar de 80 caracteres.");

// Devuelve el token completo una sola vez; en la base solo queda su hash.
export async function createMcpToken(name: string) {
  const session = await requireAdmin();

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nombre inválido" };

  const { token, hash, prefix } = generateToken();
  const supabase = await createClient();
  const { error } = await supabase.from("mcp_tokens").insert({
    name: parsed.data,
    token_hash: hash,
    token_prefix: prefix,
    created_by: session.user.id,
  });
  if (error) return { error: "No pudimos crear el token." };

  revalidatePath("/admin/mcp");
  return { token };
}

export async function revokeMcpToken(tokenId: string) {
  await requireAdmin();

  if (!z.string().uuid().safeParse(tokenId).success) return { error: "Token inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mcp_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("revoked_at", null);
  if (error) return { error: "No pudimos revocar el token." };

  revalidatePath("/admin/mcp");
  return {};
}
