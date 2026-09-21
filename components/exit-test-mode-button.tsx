"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { exitTestApplication } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";

export function ExitTestModeButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await exitTestApplication(applicationId);
          if (result?.error) {
            sileo.error({ title: "No se pudo salir del modo prueba", description: result.error });
          }
        })
      }
    >
      {pending ? "Saliendo…" : "Salir del modo prueba"}
    </Button>
  );
}
