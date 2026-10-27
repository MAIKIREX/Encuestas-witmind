import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, PlayCircle, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExitTestModeButton } from "@/components/exit-test-mode-button";
import { SiteHeader } from "@/components/site-header";
import { StartTestButton } from "@/components/start-test-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/dal";
import { formatDuration, formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "cn";

export const metadata = { title: "Mi evaluación" };

export default async function PostulacionPage({ params }: PageProps<"/postulaciones/[id]">) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();

  // Un admin ve cualquier fila por RLS; se exige que la postulación sea del
  // propio usuario para que esta vista de candidato no sirva ajenas.
  const { data: application } = await supabase
    .from("applications")
    .select(
      "id, status, is_test, job_postings(title, slug, show_results_to_candidate, assessments(name, assessment_tests(position, is_required, tests(id, time_limit_seconds, scoring_config))))",
    )
    .eq("id", id)
    .eq("candidate_id", session.user.id)
    .maybeSingle();

  if (!application) notFound();

  const { data: attempts } = await supabase
    .from("test_attempts")
    .select("id, test_id, status, duration_seconds")
    .eq("application_id", id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = application.job_postings as any;
  const tests = [...(job?.assessments?.assessment_tests ?? [])].sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.position - b.position,
  );

  const byTest = new Map((attempts ?? []).map((a) => [a.test_id, a]));
  const doneCount = (attempts ?? []).filter((a) => a.status === "scored").length;
  const progress = tests.length ? Math.round((doneCount / tests.length) * 100) : 0;

  // El primer test requerido sin resolver es el unico habilitado. Una prueba
  // descalificada por fraude cuenta como resuelta (no se reintenta), para no
  // dejar bloqueadas las pruebas siguientes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextIndex = tests.findIndex((t: any) => {
    const status = byTest.get(t.tests?.id)?.status;
    return status !== "scored" && status !== "disqualified";
  });

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <SiteHeader />

      <main className="page-main">
        <Link
          href="/panel"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-accent transition-colors"
        >
          ← Volver a mi panel
        </Link>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Evaluación de selección
          </p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            {job?.title}
          </h1>
          <div className="mt-3 h-1 w-10 rounded-full bg-accent" />
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">{job?.assessments?.name}</p>
        </div>

        {application.is_test && (
          <Alert className="mt-6">
            <AlertTitle className="flex flex-wrap items-center gap-2">
              Modo prueba
            </AlertTitle>
            <AlertDescription>
              Estás recorriendo esta batería como administrador. Nada de lo que respondas se
              registra como una postulación real; puedes salir cuando quieras y se descarta todo.
            </AlertDescription>
            <div className="mt-3">
              <ExitTestModeButton applicationId={application.id} />
            </div>
          </Alert>
        )}

        <Alert className="mt-6">
          <AlertTitle className="flex flex-wrap items-center gap-2">Antes de comenzar</AlertTitle>
          <AlertDescription>
            Cada prueba monitorea cambios de pestaña y salidas de pantalla completa. Si acumulas 3
            incidencias, esa prueba en particular se cancela automáticamente y no se puede repetir,
            pero podrás continuar sin problema con las demás pruebas de tu postulación.
          </AlertDescription>
        </Alert>

        <div className="surface-card mt-8 p-6 sm:p-7">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-3">
            <span className="text-muted-foreground">
              {doneCount} de {tests.length} pruebas completadas
            </span>
            <span className="tabular-nums font-bold text-accent">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {nextIndex === -1 && (
          <Card className="mt-8 border-emerald-400/30 bg-emerald-950/50">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="size-5" />
                <CardTitle className="text-base font-bold">Evaluación completa</CardTitle>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Terminaste todas las pruebas. El equipo de selección revisará tu perfil y se
                comunicará contigo.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-10 grid gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tests.map((t: any, i: number) => {
            const test = t.tests;
            const attempt = byTest.get(test?.id);
            const scored = attempt?.status === "scored";
            const inProgress = attempt?.status === "in_progress";
            const disqualified = attempt?.status === "disqualified";
            const locked = i > nextIndex && nextIndex !== -1;
            const Icon = scored
              ? CheckCircle2
              : disqualified
                ? ShieldAlert
                : locked
                  ? Lock
                  : inProgress
                    ? PlayCircle
                    : Circle;

            return (
              <Card
                key={test?.id}
                className={cn(
                  "transition-all duration-300",
                  locked && "opacity-60",
                  inProgress && "border-accent/50 ring-2 ring-accent/30",
                  scored && "border-white/10",
                  disqualified && "border-destructive/40"
                )}
              >
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                    <Icon
                      className={cn(
                        "size-4.5 shrink-0",
                        scored
                          ? "text-emerald-400"
                          : disqualified
                            ? "text-destructive"
                            : inProgress
                              ? "text-accent"
                              : "text-muted-foreground"
                      )}
                    />
                    <span className="text-muted-foreground font-semibold tabular-nums">{i + 1}.</span>
                    <span className="font-bold">{test?.name || `Prueba ${i + 1}`}</span>
                    {scored && <Badge variant="secondary">Completada</Badge>}
                    {inProgress && <Badge variant="default">En curso</Badge>}
                    {disqualified && <Badge variant="destructive">Descalificada</Badge>}
                    <span className="ml-auto inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-foreground font-normal">
                      {formatMinutes(test?.time_limit_seconds)}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  {scored ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Tiempo empleado: {formatDuration(attempt?.duration_seconds)}
                    </p>
                  ) : disqualified ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Se canceló por incidencias de integridad (cambios de pestaña o salidas de
                      pantalla completa). No se puede reintentar, pero no afecta a tus demás pruebas.
                    </p>
                  ) : locked ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Se habilitará automáticamente cuando completes la prueba anterior.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <StartTestButton
                        applicationId={application.id}
                        testId={test?.id}
                        resuming={inProgress}
                        requiresGender={Boolean(test?.scoring_config?.requires_gender)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Una vez iniciada la prueba, el cronómetro correrá sin interrupciones.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {nextIndex === -1 && (
          <div className="mt-8">
            <Button variant="outline" render={<Link href="/convocatorias" />}>
              Ver otras convocatorias
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
