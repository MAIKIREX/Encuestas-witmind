"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock3, CopyX, ShieldAlert } from "lucide-react";
import { sileo } from "sileo";

import { startAttempt } from "@/app/actions/attempts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const needsSelection = requiresGender && !resuming;

  function launch() {
    startTransition(async () => {
      const result = await startAttempt(applicationId, testId, gender ?? undefined);
      if (result?.error) {
        sileo.error({ title: "No se pudo iniciar", description: result.error });
      }
    });
  }

  if (resuming) {
    return (
      <Button disabled={pending} onClick={launch}>
        {pending ? "Abriendo…" : "Retomar prueba"}
      </Button>
    );
  }

  if (!showInstructions) {
    return (
      <Button onClick={() => setShowInstructions(true)}>
        Iniciar prueba
      </Button>
    );
  }

  return (
    <section
      aria-labelledby="test-rules-title"
      className="w-full max-w-xl rounded-2xl border border-accent/30 bg-secondary/35 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <ShieldAlert className="size-4.5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Antes de comenzar
          </p>
          <h3 id="test-rules-title" className="mt-0.5 font-heading text-base font-bold text-foreground">
            Reglas de esta prueba
          </h3>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-relaxed text-muted-foreground">
        <div className="flex gap-2.5">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            Reserva tiempo suficiente y asegúrate de contar con una conexión estable. Al iniciar,
            el cronómetro correrá sin interrupciones hasta terminar la prueba.
          </p>
        </div>
        <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-foreground/90">
          <p className="font-semibold text-destructive">Integridad de la evaluación</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            No cambies de pestaña ni de ventana, y evita salir de pantalla completa. Cada incidencia
            queda registrada; al acumular 3, la prueba se cancelará automáticamente y no podrá
            repetirse.
          </p>
        </div>
        <div className="flex gap-2.5">
          <CopyX className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            No copies, pegues ni uses el menú contextual durante la evaluación. Responde de forma
            individual y sin ayuda externa.
          </p>
        </div>
      </div>

      {needsSelection && (
        <div className="mt-4 grid gap-2 border-t border-border/60 pt-4">
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
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-background/30 p-3 text-xs leading-relaxed text-foreground">
        <Checkbox
          checked={rulesAccepted}
          onCheckedChange={(checked) => setRulesAccepted(checked === true)}
          className="mt-0.5"
        />
        <span>
          He leído las instrucciones y acepto las reglas de integridad de esta prueba.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          disabled={pending || !rulesAccepted || (needsSelection && !gender)}
          onClick={launch}
        >
          <CheckCircle2 data-icon="inline-start" />
          {pending ? "Abriendo…" : "Acepto e iniciar prueba"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setShowInstructions(false)}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
