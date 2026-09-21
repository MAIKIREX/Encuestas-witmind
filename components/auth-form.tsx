"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { sileo } from "sileo";

import { signIn, signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

type State = { error?: string; info?: string } | null;

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<State, FormData>(action, null);

  useEffect(() => {
    if (state?.error) sileo.error({ title: "No se pudo continuar", description: state.error });
    if (state?.info) sileo.info({ title: "Revisa tu correo", description: state.info });
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      {mode === "signup" && (
        <div className="grid gap-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          {mode === "login" && (
            <Link
              href="/recuperar"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="lg">
        {pending
          ? "Procesando…"
          : mode === "login"
            ? "Ingresar"
            : "Crear cuenta"}
      </Button>
    </form>
  );
}
