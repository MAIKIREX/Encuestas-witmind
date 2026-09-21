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
    .order("applied_at", { ascending: false });

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-heading text-2xl font-medium">Mis postulaciones</h1>

        {!applications?.length ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Todavía no has postulado</CardTitle>
              <CardDescription>
                Revisa las convocatorias abiertas y postula a la que se ajuste a tu perfil.
              </CardDescription>
            </CardHeader>
            <div className="px-(--card-spacing)">
              <Button size="sm" render={<Link href="/convocatorias" />}>
                Ver convocatorias
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-8 grid gap-3">
            {applications.map((app) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const job = app.job_postings as any;
              const done = app.status === "completed";

              return (
                <Card key={app.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {job?.title}
                      <Badge variant={done ? "secondary" : "outline"}>
                        {applicationStatusLabel(app.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Postulaste el {formatDate(app.applied_at)}
                      {app.completed_at && ` · Completaste la evaluación el ${formatDate(app.completed_at)}`}
                    </CardDescription>
                  </CardHeader>

                  <div className="px-(--card-spacing)">
                    <Button
                      size="sm"
                      variant={done ? "outline" : "default"}
                      render={<Link href={`/postulaciones/${app.id}`} />}
                    >
                      {done ? "Ver detalle" : "Continuar evaluación"}
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
