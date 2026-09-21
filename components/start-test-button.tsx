"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { startAttempt } from "@/app/actions/attempts";
import { Button } from "@/components/ui/button";

export function StartTestButton({
  applicationId,
  testId,
  resuming,
}: {
  applicationId: string;
  testId: string;
  resuming: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await startAttempt(applicationId, testId);
          if (result?.error) {
            sileo.error({ title: "No se pudo iniciar", description: result.error });
          }
        })
      }
    >
      {pending ? "Abriendo…" : resuming ? "Retomar prueba" : "Iniciar prueba"}
    </Button>
  );
}
