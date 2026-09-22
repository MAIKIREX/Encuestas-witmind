import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ApplicationDecision } from "@/components/admin/application-decision";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  applicationStatusLabel,
  formatDate,
  formatDateTime,
  formatDuration,
  integrityLabel,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AttemptResponse, TestItem, TestItemOption } from "@/lib/supabase/types";

export const metadata = { title: "Informe del candidato" };

const EVENT_LABEL: Record<string, string> = {
  tab_hidden: "Cambió de pestaña",
  window_blur: "Salió de la ventana",
  fullscreen_exit: "Salió de pantalla completa",
  copy: "Intentó copiar",
  paste: "Intentó pegar",
  contextmenu: "Abrió el menú contextual",
  devtools: "Abrió herramientas de desarrollo",
  heartbeat_gap: "Se desconectó durante la prueba",
};

type LikertLabel = { value: number; label: string };

function likertLabelsFromConfig(config: unknown): LikertLabel[] {
  if (!config || typeof config !== "object" || Array.isArray(config)) return [];

  const labels = (config as { likert_labels?: unknown }).likert_labels;
  if (!Array.isArray(labels)) return [];

  return labels.filter(
    (label): label is LikertLabel =>
      typeof label === "object" &&
      label !== null &&
      "value" in label &&
      "label" in label &&
      typeof label.value === "number" &&
      typeof label.label === "string",
  );
}

function responseContent(
  response: AttemptResponse | undefined,
  item: TestItem,
  options: TestItemOption[],
  likertLabels: LikertLabel[],
): ReactNode {
  if (!response) return <span className="text-muted-foreground">Sin respuesta registrada</span>;

  const optionLabel = (id: string | null) =>
    id ? options.find((option) => option.id === id)?.label ?? "Opción no disponible" : null;

  if (item.item_type === "forced_choice") {
    return (
      <div className="grid gap-1.5">
        <p>
          <span className="font-medium">Más se identifica: </span>
          {optionLabel(response.option_id) ?? "Sin respuesta registrada"}
        </p>
        {response.least_option_id && (
          <p>
            <span className="font-medium">Menos se identifica: </span>
            {optionLabel(response.least_option_id)}
          </p>
        )}
      </div>
    );
  }

  if (item.item_type === "free_response") {
    const value = response.value_text ?? response.value_numeric?.toString();
    return value ? <span className="whitespace-pre-wrap">{value}</span> : "Sin respuesta registrada";
  }

  if (item.item_type === "likert") {
    const label = likertLabels.find((entry) => entry.value === response.value_numeric)?.label;
    return label ? `${label} (${response.value_numeric})` : `Valor seleccionado: ${response.value_numeric ?? "—"}`;
  }

  return optionLabel(response.option_id) ?? "Sin respuesta registrada";
}

export default async function InformePage({ params }: PageProps<"/admin/postulaciones/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, candidate_id, status, applied_at, completed_at, job_postings(id, title)")
    .eq("id", id)
    .maybeSingle();

  if (!application) notFound();

  const [{ data: profile }, { data: attempts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, doc_number, phone")
      .eq("id", application.candidate_id)
      .maybeSingle(),
    supabase
      .from("test_attempts")
      .select(
        "id, test_id, status, started_at, submitted_at, duration_seconds, integrity_level, events_warn, events_critical, integrity_strikes, disqualification_reason, tests(name, slug, description, scoring_strategy, scoring_config), attempt_scores(raw_score, max_score, percent, percentile, band, norm_n)",
      )
      .eq("application_id", id)
      .order("started_at", { ascending: true }),
  ]);

  const attemptIds = (attempts ?? []).map((a) => a.id);
  const testIds = [...new Set((attempts ?? []).map((a) => a.test_id))];

  const [{ data: subscales }, { data: events }, { data: responses }, { data: items }] = await Promise.all([
    attemptIds.length
      ? supabase
          .from("attempt_subscale_scores")
          .select("attempt_id, raw_score, max_score, percent, band, test_subscales(code, name, display_order)")
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    attemptIds.length
      ? supabase
          .from("proctoring_events")
          .select("attempt_id, event_type, severity, server_ts")
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    attemptIds.length
      ? supabase
          .from("attempt_responses")
          .select("attempt_id, item_id, option_id, value_numeric, value_text, least_option_id, answered_at, client_elapsed_ms, revisions")
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    testIds.length
      ? supabase
          .from("test_items")
          .select("id, test_id, position, item_type, stem, media_url, subscale_id, time_limit_seconds, config, is_active")
          .in("test_id", testIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const itemIds = (items ?? []).map((item) => item.id);
  const { data: options } = itemIds.length
    ? await supabase
        .from("test_item_options")
        .select("id, item_id, code, label, media_url, display_order")
        .in("item_id", itemIds)
        .order("display_order", { ascending: true })
    : { data: [] };

  const subsByAttempt = new Map<string, typeof subscales>();
  for (const s of subscales ?? []) {
    const list = subsByAttempt.get(s.attempt_id) ?? [];
    list.push(s);
    subsByAttempt.set(s.attempt_id, list);
  }

  const eventCounts = new Map<string, Map<string, number>>();
  for (const e of events ?? []) {
    const perAttempt = eventCounts.get(e.attempt_id) ?? new Map<string, number>();
    perAttempt.set(e.event_type, (perAttempt.get(e.event_type) ?? 0) + 1);
    eventCounts.set(e.attempt_id, perAttempt);
  }

  const responsesByAttempt = new Map<string, Map<string, AttemptResponse>>();
  for (const response of responses ?? []) {
    const perAttempt = responsesByAttempt.get(response.attempt_id) ?? new Map<string, AttemptResponse>();
    perAttempt.set(response.item_id, response);
    responsesByAttempt.set(response.attempt_id, perAttempt);
  }

  const itemsByTest = new Map<string, TestItem[]>();
  for (const item of items ?? []) {
    const perTest = itemsByTest.get(item.test_id) ?? [];
    perTest.push(item);
    itemsByTest.set(item.test_id, perTest);
  }

  const optionsByItem = new Map<string, TestItemOption[]>();
  for (const option of options ?? []) {
    const perItem = optionsByItem.get(option.item_id) ?? [];
    perItem.push(option);
    optionsByItem.set(option.item_id, perItem);
  }

  const totalSeconds = (attempts ?? []).reduce((acc, a) => acc + (a.duration_seconds ?? 0), 0);
  const percents = (attempts ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a) => (a.attempt_scores as any)?.percent)
    .filter((p): p is number => p !== null && p !== undefined);
  const avg = percents.length
    ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = application.job_postings as any;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link
        href={`/admin/convocatorias/${job?.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Volver a candidatos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {profile?.full_name || "Candidato sin nombre"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {job?.title} · Postuló el {formatDate(application.applied_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {profile?.doc_number && <span>Doc. {profile.doc_number}</span>}
            {profile?.phone && <span>Tel. {profile.phone}</span>}
            <Badge variant="outline">{applicationStatusLabel(application.status)}</Badge>
          </div>
        </div>

        <ApplicationDecision applicationId={application.id} status={application.status} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Promedio general</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {avg === null ? "—" : `${avg}%`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Tiempo total</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totalSeconds ? formatDuration(totalSeconds) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pruebas completadas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(attempts ?? []).filter((a) => a.status === "scored").length} de{" "}
              {attempts?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <h2 className="mt-10 font-heading text-lg font-semibold">Resultado por prueba</h2>

      {!attempts?.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Sin pruebas rendidas</CardTitle>
            <CardDescription>El candidato aún no ha iniciado la evaluación.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4">
          {attempts.map((attempt) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const test = attempt.tests as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const score = attempt.attempt_scores as any;
            const subs = [...(subsByAttempt.get(attempt.id) ?? [])].sort(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (a: any, b: any) =>
                (a.test_subscales?.display_order ?? 0) - (b.test_subscales?.display_order ?? 0),
            );
            const evts = eventCounts.get(attempt.id);
            const testItems = itemsByTest.get(attempt.test_id) ?? [];
            const attemptResponses = responsesByAttempt.get(attempt.id) ?? new Map<string, AttemptResponse>();
            const answeredCount = testItems.filter((item) => attemptResponses.has(item.id)).length;
            // Elección forzada (PPG-IPG, Test de Liderazgo): la lectura del
            // resultado es "cuál subescala saca el puntaje más alto", no un
            // total general — se resalta la subescala dominante.
            const isIpsative = test?.scoring_strategy === "ipsative";
            const maxRaw = isIpsative
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? Math.max(0, ...subs.map((s: any) => Number(s.raw_score) || 0))
              : null;

            return (
              <Card key={attempt.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {test?.name}
                    {score?.band && <Badge variant="secondary">{score.band}</Badge>}
                    <span className="ml-auto text-2xl tabular-nums">
                      {score?.percent !== null && score?.percent !== undefined
                        ? `${score.percent}%`
                        : "—"}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {score
                      ? `${score.raw_score} de ${score.max_score} puntos`
                      : attempt.status === "disqualified"
                        ? "Prueba descalificada por integridad"
                        : "Prueba no calificada"}
                    {" · "}
                    Tiempo: {formatDuration(attempt.duration_seconds)}
                    {attempt.submitted_at && ` · Enviada el ${formatDateTime(attempt.submitted_at)}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                  {score?.percentile !== null && score?.percentile !== undefined ? (
                    <p className="text-sm text-muted-foreground">
                      Percentil {score.percentile} respecto de {score.norm_n} candidatos que
                      rindieron esta prueba.
                    </p>
                  ) : (
                    score && (
                      <p className="text-sm text-muted-foreground">
                        Percentil no disponible: se necesitan más candidatos para construir una
                        norma confiable ({score.norm_n ?? 0} hasta ahora).
                      </p>
                    )
                  )}

                  {subs.length > 0 && (
                    <>
                      <Separator />
                      <div className="grid gap-3">
                        <p className="text-sm font-medium">Desglose por área</p>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {subs.map((s: any) => {
                          const isDominant =
                            isIpsative && maxRaw !== null && maxRaw > 0 && Number(s.raw_score) === maxRaw;
                          return (
                            <div key={s.test_subscales?.code} className="grid gap-1.5">
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className={isDominant ? "font-semibold" : undefined}>
                                  {s.test_subscales?.name}
                                  {isDominant && (
                                    <Badge variant="secondary" className="ml-2 align-middle">
                                      Dominante
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                  {s.raw_score}/{s.max_score} · {s.percent}%
                                  {s.band && ` · ${s.band}`}
                                </span>
                              </div>
                              <Progress value={Number(s.percent) || 0} />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex flex-wrap items-center gap-2">
                    {attempt.status === "disqualified" ? (
                      <Badge variant="destructive">
                        Descalificada ({attempt.integrity_strikes} incidencias)
                      </Badge>
                    ) : (
                      <Badge
                        variant={
                          attempt.integrity_level === "critical"
                            ? "destructive"
                            : attempt.integrity_level === "warn"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {integrityLabel(attempt.integrity_level)}
                      </Badge>
                    )}

                    {evts && evts.size > 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {[...evts.entries()]
                          .map(([type, n]) => `${EVENT_LABEL[type] ?? type} (${n})`)
                          .join(" · ")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No se registraron incidencias.
                      </span>
                    )}
                  </div>

                  {attempt.status === "disqualified" && attempt.disqualification_reason && (
                    <p className="text-sm text-muted-foreground">
                      {attempt.disqualification_reason}
                    </p>
                  )}

                  {testItems.length > 0 && (
                    <>
                      <Separator />
                      <details className="group rounded-lg border bg-muted/20 p-4">
                        <summary className="cursor-pointer list-none font-medium marker:hidden">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span>Respuestas del candidato</span>
                            <span className="text-sm font-normal text-muted-foreground">
                              {answeredCount} de {testItems.length} respondidas
                            </span>
                          </span>
                        </summary>
                        <div className="mt-4 grid gap-3">
                          {testItems.map((item, index) => (
                            <div key={item.id} className="rounded-md border bg-background p-3 text-sm">
                              <p className="font-medium">
                                {index + 1}. {item.stem}
                              </p>
                              <div className="mt-2 text-muted-foreground">
                                {responseContent(
                                  attemptResponses.get(item.id),
                                  item,
                                  optionsByItem.get(item.id) ?? [],
                                  likertLabelsFromConfig((test as { scoring_config?: unknown } | null)?.scoring_config),
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Las señales de integridad son indicios, no prueba de irregularidad. Conviene contrastarlas
        con el candidato antes de tomar una decisión.
      </p>
    </main>
  );
}
