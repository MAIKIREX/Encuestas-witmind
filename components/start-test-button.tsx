"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";

import { startAttempt } from "@/app/actions/attempts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function StartTestButton({
  applicationId,
  testId,
  resuming,
  requiresGender,
}: {
  applicationId: string;
  testId: string;
  resuming: boolean;
  requiresGender?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [gender, setGender] = useState<"M" | "F" | null>(null);
  const needsSelection = requiresGender && !resuming;

  function launch() {
    startTransition(async () => {
      const result = await startAttempt(applicationId, testId, gender ?? undefined);
      if (result?.error) {
        sileo.error({ title: "No se pudo iniciar", description: result.error });
      }
    });
  }

  if (needsSelection) {
    return (
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">
          Esta prueba necesita saber tu sexo para aplicar el baremo correcto.
        </Label>
        <RadioGroup
          value={gender ?? undefined}
          onValueChange={(v) => setGender(v as "M" | "F")}
          className="flex items-center gap-4"
        >
          <label className="flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="M" /> Hombre
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="F" /> Mujer
          </label>
        </RadioGroup>
        <Button disabled={pending || !gender} onClick={launch} className="w-fit">
          {pending ? "Abriendo…" : "Iniciar prueba"}
        </Button>
      </div>
    );
  }

  return (
    <Button disabled={pending} onClick={launch}>
      {pending ? "Abriendo…" : resuming ? "Retomar prueba" : "Iniciar prueba"}
    </Button>
  );
}
