import Link from "next/link";
import { MapPin, Timer } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convocatorias abiertas" };

export default async function ConvocatoriasPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("job_postings")
    .select(
      "id, slug, title, description, location, employment_type, assessments(name, assessment_tests(tests(time_limit_seconds)))",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-full max-w-5xl rounded-full bg-accent/40 blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            oportunidades de talento
          </p>
          <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Convocatorias abiertas
          </h1>
          <div className="mt-3 mb-4 h-1 w-9 rounded-full bg-primary" />
          <p className="text-muted-foreground max-w-xl">
            Elige una vacante para conocer el perfil del puesto y las evaluaciones psicométricas que incluye el proceso.
          </p>
        </div>

        {!jobs?.length ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>No hay convocatorias abiertas</CardTitle>
              <CardDescription>
                Vuelve más adelante: publicamos nuevas vacantes con frecuencia.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-8 grid gap-4 sm:gap-5">
            {jobs.map((job) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tests = ((job.assessments as any)?.assessment_tests ?? []) as {
                tests: { time_limit_seconds: number | null } | null;
              }[];
              const total = tests.reduce((acc, t) => acc + (t.tests?.time_limit_seconds ?? 0), 0);

              return (
                <Card
                  key={job.id}
                  className="hover:translate-y-[-2px] transition-all duration-300 hover:shadow-[0_16px_36px_-10px_rgba(11,43,64,0.1)]"
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg sm:text-xl font-bold">{job.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1.5 leading-relaxed">
                          {job.description}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-start shrink-0"
                        render={<Link href={`/convocatorias/${job.slug}`} />}
                      >
                        Ver detalle
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      {job.location && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-secondary-foreground font-medium">
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
                          <Timer className="size-3" />
                          Evaluación de {formatMinutes(total)}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
