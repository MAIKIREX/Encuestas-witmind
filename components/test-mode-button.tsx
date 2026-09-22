"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { startTestPreview } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";

export function TestModeButton({
  testId,
  className,
}: {
  testId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          const result = await startTestPreview(testId);
          if (result?.error) {
            sileo.error({ title: "No se pudo iniciar el modo prueba", description: result.error });
          }
        })
      }
    >
      {pending ? "Iniciando…" : "Probar"}
    </Button>
  );
}
