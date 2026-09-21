"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const signUpSchema = credentials.extend({
  fullName: z.string().min(3, "Ingresa tu nombre completo"),
});

const emailOnlySchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// Server Actions no reciben la URL de la petición; se arma desde los headers
// para que el enlace de recuperación apunte al mismo origen que sirvió la página.
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host")}`;
}

export async function signIn(_prev: unknown, formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Correo o contraseña incorrectos." };

  const next = String(formData.get("next") || "/panel");
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: unknown, formData: FormData) {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    return {
      error:
        error.message.includes("already registered")
          ? "Ya existe una cuenta con ese correo."
          : "No pudimos crear tu cuenta. Vuelve a intentarlo.",
    };
  }

  // Si el proyecto exige confirmar el correo, no hay sesión todavía.
  if (!data.session) {
    return { info: "Te enviamos un correo para confirmar tu cuenta." };
  }

  const next = String(formData.get("next") || "/panel");
  revalidatePath("/", "layout");
  redirect(next);
}

export async function requestPasswordReset(_prev: unknown, formData: FormData) {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-contrasena`,
  });

  // Supabase no distingue "correo no registrado" en la respuesta para no
  // filtrar qué correos existen; el mensaje es siempre el mismo por diseño.
  return {
    info: "Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña.",
  };
}

export async function updatePassword(_prev: unknown, formData: FormData) {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "El enlace venció o ya se usó. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No pudimos actualizar tu contraseña. Vuelve a intentarlo." };

  revalidatePath("/", "layout");
  redirect("/panel");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
