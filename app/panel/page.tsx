import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/dal";
import { applicationStatusLabel, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi panel" };

export default async function PanelPage() {
  const session = await requireUser();
  const supabase = await createClient();

  // RLS deja pasar todas las filas a un admin (política applications_admin_all).
  // Este panel es "mis postulaciones", así que filtramos por el propio usuario
  // explícitamente en vez de confiar solo en RLS.
  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, applied_at, completed_at, job_postings(title, slug)")
    .eq("candidate_id", session.user.id)
    .eq("is_test", false)
    .order("applied_at", { ascending: false });

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-full max-w-4xl rounded-full bg-accent/40 blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            área del candidato
          </p>
          <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Mis postulaciones
          </h1>
          <div className="mt-2.5 mb-4 h-1 w-9 rounded-full bg-primary" />
          <p className="text-muted-foreground text-sm">
            Revisa el avance de tus evaluaciones y el estado de tus procesos de selección.
          </p>
        </div>

        {!applications?.length ? (
          <Card className="mt-8 text-center p-8">
            <CardHeader className="items-center">
              <CardTitle>Todavía no has postulado</CardTitle>
              <CardDescription>
                Revisa las convocatorias abiertas y postula a la que se ajuste a tu perfil.
              </CardDescription>
            </CardHeader>
            <div className="mt-4 flex justify-center">
              <Button render={<Link href="/convocatorias" />}>
                Ver convocatorias abiertas
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-8 grid gap-4">
            {applications.map((app) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const job = app.job_postings as any;
              const done = app.status === "completed";

              return (
                <Card
                  key={app.id}
                  className="hover:translate-y-[-2px] transition-all duration-300 hover:shadow-[0_16px_36px_-10px_rgba(11,43,64,0.08)]"
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg font-bold">{job?.title}</CardTitle>
                          <Badge variant={done ? "secondary" : "default"}>
                            {applicationStatusLabel(app.status)}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1 text-xs sm:text-sm">
                          Postulaste el {formatDate(app.applied_at)}
                          {app.completed_at && ` · Completada el ${formatDate(app.completed_at)}`}
                        </CardDescription>
                      </div>

                      <Button
                        size="sm"
                        variant={done ? "outline" : "default"}
                        className="self-start sm:self-center shrink-0"
                        render={<Link href={`/postulaciones/${app.id}`} />}
                      >
                        {done ? "Ver detalle" : "Continuar evaluación"}
                      </Button>
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
