"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { setJobStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function JobStatusToggle({
  jobId,
  status,
  className,
}: {
  jobId: string;
  status: "draft" | "published" | "closed";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  const next = status === "published" ? "closed" : "published";
  const label = status === "published" ? "Cerrar convocatoria" : "Publicar";

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          const result = await setJobStatus(jobId, next);
          if (result?.error) {
            sileo.error({ title: "No se pudo actualizar", description: result.error });
          } else {
            sileo.success({
              title: next === "published" ? "Convocatoria publicada" : "Convocatoria cerrada",
              description:
                next === "published"
                  ? "Ya es visible para los candidatos."
                  : "Dejó de aceptar nuevas postulaciones.",
            });
          }
        })
      }
    >
      {pending ? "Guardando…" : label}
    </Button>
  );
}
