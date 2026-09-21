"use client";

import { useTransition } from "react";
import { sileo } from "sileo";

import { applyToJob } from "@/app/actions/applications";
import { usePageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";

export function ApplyButton({
  jobId,
  jobSlug,
  authenticated,
}: {
  jobId: string;
  jobSlug: string;
  authenticated: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { transitionTo } = usePageTransition();

  if (!authenticated) {
    return (
      <Button onClick={() => transitionTo(`/login?next=/convocatorias/${jobSlug}`)}>
        Ingresar para postular
      </Button>
    );
  }

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await applyToJob(jobId, jobSlug);
          if (result?.error) {
            sileo.error({ title: "No se pudo postular", description: result.error });
          }
        })
      }
    >
      {pending ? "Postulando…" : "Postular"}
    </Button>
  );
}
