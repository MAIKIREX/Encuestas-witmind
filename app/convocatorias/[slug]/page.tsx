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
      <SiteHeader />

      <main className="page-main">
        <Link
          href="/convocatorias"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-accent transition-colors"
        >
          ← Volver a convocatorias
        </Link>

        <h1 className="mt-5 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
          {job.title}
        </h1>
        <div className="mt-3 h-1 w-10 rounded-full bg-accent" />

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-foreground font-medium border border-white/10">
              <MapPin className="size-3 text-accent" />
              {job.location}
            </span>
          )}
          {job.employment_type && (
            <span className="inline-flex items-center rounded-full bg-card px-3 py-1.5 text-foreground font-medium border border-white/10">
              {job.employment_type}
            </span>
          )}
          {total > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-accent font-medium border border-accent/30">
              <Timer className="size-3" />
              Evaluación de {formatMinutes(total)}
            </span>
          )}
        </div>

        <div className="surface-card mt-10 p-6 sm:p-8">
          <h2 className="font-heading text-base font-bold text-foreground">Descripción del puesto</h2>
          <p className="mt-3 max-w-[65ch] leading-relaxed text-sm text-foreground/90 whitespace-pre-line">
            {job.description}
          </p>
        </div>

        <div className="mt-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Batería de pruebas
          </p>
          <h2 className="mt-2 font-heading text-xl sm:text-2xl font-bold text-foreground">La evaluación</h2>
          <p className="mt-2 max-w-[65ch] text-sm text-muted-foreground leading-relaxed">
            Se rinde en el orden indicado. Puedes pausar entre una prueba y otra, pero una vez que
            inicias una prueba debes terminarla.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {tests.map((t: any, i: number) => (
            <Card key={t.position} size="sm" className="hover:border-accent/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span>{t.tests?.name}</span>
                  <span className="ml-auto inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-foreground font-normal">
                    {formatMinutes(t.tests?.time_limit_seconds)}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm pl-[2.125rem]">
                  {t.tests?.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-14 border-accent/25 bg-gradient-to-r from-[#1d4a35] via-card to-card">
          <CardContent>
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
