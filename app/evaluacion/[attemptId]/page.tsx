import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { AttemptState, LikertLabel } from "@/lib/supabase/types";

import { Runner } from "./runner";

export const metadata = { title: "Evaluación en curso" };

export default async function EvaluacionPage({ params }: PageProps<"/evaluacion/[attemptId]">) {
  const { attemptId } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  // Un admin ve cualquier intento por RLS; se exige que sea propio para que
  // esta vista de candidato nunca deje rendir o ver el intento de otra persona.
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("id, application_id, status, tests(scoring_config), applications!inner(candidate_id)")
    .eq("id", attemptId)
    .eq("applications.candidate_id", session.user.id)
    .maybeSingle();

  if (!attempt) notFound();
  if (attempt.status !== "in_progress") redirect(`/postulaciones/${attempt.application_id}`);

  const { data, error } = await supabase.rpc("get_attempt_state", { p_attempt_id: attemptId });
  if (error || !data) notFound();

  const state = data as unknown as AttemptState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (attempt.tests as any)?.scoring_config ?? {};
  const likertLabels = (config.likert_labels ?? []) as LikertLabel[];

  return (
    <Runner
      state={state}
      likertLabels={likertLabels}
      applicationId={attempt.application_id}
    />
  );
}
