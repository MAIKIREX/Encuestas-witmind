import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { StartTestButton } from "@/components/start-test-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/dal";
import { formatDuration, formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
      "id, status, job_postings(title, slug, show_results_to_candidate, assessments(name, assessment_tests(position, is_required, tests(id, name, description, time_limit_seconds))))",
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

  // El primer test requerido sin calificar es el unico habilitado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextIndex = tests.findIndex((t: any) => byTest.get(t.tests?.id)?.status !== "scored");

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link href="/panel" className="text-sm text-muted-foreground hover:underline">
          ← Volver a mi panel
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-medium">{job?.title}</h1>
        <p className="mt-1 text-muted-foreground">{job?.assessments?.name}</p>

        <div className="mt-6 grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {doneCount} de {tests.length} pruebas completadas
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {nextIndex === -1 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Evaluación completa</CardTitle>
              <CardDescription>
                Terminaste todas las pruebas. El equipo de selección revisará tu resultado y se
                comunicará contigo.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8 grid gap-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tests.map((t: any, i: number) => {
            const test = t.tests;
            const attempt = byTest.get(test?.id);
            const scored = attempt?.status === "scored";
            const inProgress = attempt?.status === "in_progress";
            const locked = i > nextIndex && nextIndex !== -1;
            const Icon = scored ? CheckCircle2 : locked ? Lock : inProgress ? PlayCircle : Circle;

            return (
              <Card key={test?.id} className={locked ? "opacity-60" : undefined}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <Icon
                      className={`size-4 ${scored ? "text-foreground" : "text-muted-foreground"}`}
                    />
                    <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                    {test?.name}
                    {scored && <Badge variant="secondary">Completada</Badge>}
                    {inProgress && <Badge variant="outline">En curso</Badge>}
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {formatMinutes(test?.time_limit_seconds)}
                    </span>
                  </CardTitle>
                  <CardDescription>{test?.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  {scored ? (
                    <p className="text-sm text-muted-foreground">
                      Tiempo empleado: {formatDuration(attempt?.duration_seconds)}
                    </p>
                  ) : locked ? (
                    <p className="text-sm text-muted-foreground">
                      Se habilita cuando completes la prueba anterior.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <StartTestButton
                        applicationId={application.id}
                        testId={test?.id}
                        resuming={inProgress}
                      />
                      <p className="text-sm text-muted-foreground">
                        Una vez que inicies, el tiempo corre sin pausa.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {nextIndex === -1 && (
          <Button className="mt-8" variant="outline" render={<Link href="/convocatorias" />}>
            Ver otras convocatorias
          </Button>
        )}
      </main>
    </>
  );
}
