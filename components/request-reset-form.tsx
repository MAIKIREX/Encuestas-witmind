"use client";

import { useActionState, useEffect } from "react";
import { sileo } from "sileo";

import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error?: string; info?: string } | null;

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    requestPasswordReset,
    null,
  );

  useEffect(() => {
    if (state?.error) sileo.error({ title: "No se pudo continuar", description: state.error });
    if (state?.info) sileo.success({ title: "Revisa tu correo", description: state.info });
  }, [state]);

  if (state?.info) {
    return (
      <p className="text-sm text-muted-foreground">
        Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña.
        Revisa tu bandeja de entrada (y la carpeta de spam).
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
