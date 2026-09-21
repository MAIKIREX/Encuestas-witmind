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

  const isAdmin = session?.role === "admin";

  let existingApplicationId: string | null = null;
  if (session && !isAdmin) {
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
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-full max-w-4xl rounded-full bg-accent/40 blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/convocatorias"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          ← Volver a convocatorias
        </Link>

        <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {job.title}
        </h1>
        <div className="mt-2.5 mb-4 h-1 w-9 rounded-full bg-primary" />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-secondary-foreground font-medium">
              <MapPin className="size-3" />
              {job.location}
            </span>
          )}
          {job.employment_type && (
            <span className="inline-flex items-center rounded-full bg-secondary/80 px-3 py-1 text-secondary-foreground font-medium">
              {job.employment_type}
            </span>
          )}
          {total > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
              <Timer className="size-3" />
              Evaluación de {formatMinutes(total)}
            </span>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-[0_12px_32px_-8px_rgba(11,43,64,0.06)]">
          <h2 className="font-heading text-base font-bold text-foreground">Descripción del puesto</h2>
          <p className="mt-3 leading-relaxed text-sm text-foreground/90 whitespace-pre-line">
            {job.description}
          </p>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            batería de pruebas
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold text-foreground">La evaluación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se rinde en el orden indicado. Puedes pausar entre una prueba y otra, pero una vez que
            inicias una prueba debes terminarla.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tests.map((t: any, i: number) => (
            <Card key={t.position} size="sm" className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span>{t.tests?.name}</span>
                  <span className="ml-auto inline-flex items-center rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                    {formatMinutes(t.tests?.time_limit_seconds)}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm pl-8">
                  {t.tests?.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-primary/20 bg-gradient-to-r from-accent/25 via-card to-card">
          <CardContent className="p-6">
            {isAdmin ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Vista de administrador</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Como administrador no postulas aquí. Para probar cómo vive un candidato cada
                    prueba, ve al Banco de pruebas.
                  </p>
                </div>
                <Button variant="outline" render={<Link href="/admin/tests" />}>
                  Ir al banco de pruebas
                </Button>
              </div>
            ) : existingApplicationId ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Ya postulaste a esta convocatoria</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Puedes continuar o consultar el estado de tu evaluación.
                  </p>
                </div>
                <Button render={<Link href={`/postulaciones/${existingApplicationId}`} />}>
                  Continuar mi evaluación
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">¿Listo para postular?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session
                      ? "Al confirmar tu postulación se habilitará la batería de pruebas."
                      : "Necesitas iniciar sesión o crear una cuenta para postular."}
                  </p>
                </div>
                <ApplyButton jobId={job.id} jobSlug={job.slug} authenticated={Boolean(session)} />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
