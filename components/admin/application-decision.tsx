"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { setApplicationStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "shortlisted", label: "Preseleccionar" },
  { value: "hired", label: "Contratar" },
  { value: "rejected", label: "Descartar" },
] as const;

export function ApplicationDecision({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={
            status === opt.value ? "default" : opt.value === "rejected" ? "destructive" : "outline"
          }
          disabled={pending || status === opt.value}
          onClick={() =>
            startTransition(async () => {
              const result = await setApplicationStatus(applicationId, opt.value);
              if (result?.error) {
                sileo.error({ title: "No se pudo guardar", description: result.error });
              } else {
                sileo.success({ title: "Postulación actualizada", description: opt.label });
              }
            })
          }
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
