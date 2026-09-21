"use client";

import { useActionState, useEffect } from "react";
import { sileo } from "sileo";

import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

type State = { error?: string } | null;

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(updatePassword, null);

  useEffect(() => {
    if (state?.error) sileo.error({ title: "No se pudo continuar", description: state.error });
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
