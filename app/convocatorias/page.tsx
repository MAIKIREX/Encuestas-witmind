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
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="font-heading text-2xl font-medium">Convocatorias abiertas</h1>
        <p className="mt-2 text-muted-foreground">
          Elige una vacante para ver el perfil y la evaluación que incluye.
        </p>

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
          <div className="mt-8 grid gap-4">
            {jobs.map((job) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tests = ((job.assessments as any)?.assessment_tests ?? []) as {
                tests: { time_limit_seconds: number | null } | null;
              }[];
              const total = tests.reduce((acc, t) => acc + (t.tests?.time_limit_seconds ?? 0), 0);

              return (
                <Card key={job.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{job.description}</CardDescription>

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
                  </CardHeader>

                  <div className="px-(--card-spacing)">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/convocatorias/${job.slug}`} />}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
