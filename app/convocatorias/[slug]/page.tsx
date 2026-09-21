import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Timer } from "lucide-react";

import { ApplyButton } from "@/components/apply-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";
import { formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ConvocatoriaPage({ params }: PageProps<"/convocatorias/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const session = await getSession();

  const { data: job } = await supabase
    .from("job_postings")
    .select(
      "id, slug, title, description, location, employment_type, assessments(name, description, assessment_tests(position, tests(name, description, time_limit_seconds)))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!job) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessment = job.assessments as any;
  const tests = [...(assessment?.assessment_tests ?? [])].sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.position - b.position,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = tests.reduce((acc: number, t: any) => acc + (t.tests?.time_limit_seconds ?? 0), 0);

  let existingApplicationId: string | null = null;
  if (session) {
    // Un admin ve todas las filas por RLS; se filtra por su propio usuario
    // para no mostrarle la postulación de otro candidato como si fuera suya.
    const { data: app } = await supabase
      .from("applications")
      .select("id")
      .eq("job_posting_id", job.id)
      .eq("candidate_id", session.user.id)
      .maybeSingle();
    existingApplicationId = app?.id ?? null;
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link href="/convocatorias" className="text-sm text-muted-foreground hover:underline">
          ← Volver a convocatorias
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-medium">{job.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {job.location}
            </span>
          )}
          {job.employment_type && <span>{job.employment_type}</span>}
          {total > 0 && (
            <span className="flex items-center gap-1.5">
              <Timer className="size-3.5" />
              Evaluación de {formatMinutes(total)}
            </span>
          )}
        </div>

        <p className="mt-6 leading-relaxed whitespace-pre-line">{job.description}</p>

        <h2 className="mt-10 font-heading text-lg font-medium">La evaluación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se rinde en el orden indicado. Puedes pausar entre una prueba y otra, pero una vez que
          inicias una prueba debes terminarla.
        </p>

        <div className="mt-4 grid gap-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tests.map((t: any, i: number) => (
            <Card key={t.position} size="sm">
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                  {t.tests?.name}
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {formatMinutes(t.tests?.time_limit_seconds)}
                  </span>
                </CardTitle>
                <CardDescription>{t.tests?.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-10">
          <CardContent>
            {existingApplicationId ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Ya postulaste a esta convocatoria.</p>
                <Button render={<Link href={`/postulaciones/${existingApplicationId}`} />}>
                  Continuar mi evaluación
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {session
                    ? "Al postular se habilita tu evaluación."
                    : "Necesitas una cuenta para postular."}
                </p>
                <ApplyButton jobId={job.id} jobSlug={job.slug} authenticated={Boolean(session)} />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
