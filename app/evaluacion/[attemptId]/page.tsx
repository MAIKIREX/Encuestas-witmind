import { notFound, redirect } from "next/navigation";

import { signAttemptMediaPaths } from "@/app/actions/media";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { AttemptState, LikertLabel } from "@/lib/supabase/types";

import { Runner } from "./runner";

// `media_url` en la BD guarda el path del bucket privado, no una URL usable.
// Se resuelve aca, en el servidor, a URLs firmadas de corta duracion antes de
// mandar el estado al cliente.
async function withSignedMedia(state: AttemptState): Promise<AttemptState> {
  const paths = state.items.flatMap((item) => [
    item.media_url,
    ...item.options.map((o) => o.media_url),
  ]).filter((p): p is string => Boolean(p));

  if (paths.length === 0) return state;

  const signed = await signAttemptMediaPaths(paths);
  return {
    ...state,
    items: state.items.map((item) => ({
      ...item,
      media_url: item.media_url ? (signed[item.media_url] ?? null) : null,
      options: item.options.map((o) => ({
        ...o,
        media_url: o.media_url ? (signed[o.media_url] ?? null) : null,
      })),
    })),
  };
}

export const metadata = { title: "Evaluación en curso" };

export default async function EvaluacionPage({ params }: PageProps<"/evaluacion/[attemptId]">) {
  const { attemptId } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  // Un admin ve cualquier intento por RLS; se exige que sea propio para que
  // esta vista de candidato nunca deje rendir o ver el intento de otra persona.
  const [{ data: attempt }] = await Promise.all([
    supabase
      .from("test_attempts")
      .select("id, application_id, status, tests(scoring_config), applications!inner(candidate_id)")
      .eq("id", attemptId)
      .eq("applications.candidate_id", session.user.id)
      .maybeSingle(),
  ]);

  if (!attempt) notFound();
  if (attempt.status !== "in_progress") redirect(`/postulaciones/${attempt.application_id}`);

  const { data, error } = await supabase.rpc("get_attempt_state", { p_attempt_id: attemptId });
  if (error || !data) notFound();

  const state = await withSignedMedia(data as unknown as AttemptState);
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
