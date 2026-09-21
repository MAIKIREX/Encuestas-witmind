import Link from "next/link";

import { JobStatusToggle } from "@/components/admin/job-status-toggle";
import { NewJobDialog } from "@/components/admin/new-job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convocatorias · Administración" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicada",
  closed: "Cerrada",
};

export default async function AdminConvocatoriasPage() {
  const supabase = await createClient();

  const [{ data: jobs }, { data: assessments }] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id, slug, title, status, published_at, created_at, assessments(name)")
      .order("created_at", { ascending: false }),
    supabase.from("assessments").select("id, name").eq("is_active", true).order("name"),
  ]);

  const { data: counts } = await supabase.from("applications").select("job_posting_id, status");

  const byJob = new Map<string, { total: number; completed: number }>();
  for (const a of counts ?? []) {
    const entry = byJob.get(a.job_posting_id) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (a.status === "completed") entry.completed += 1;
    byJob.set(a.job_posting_id, entry);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-medium">Convocatorias</h1>
          <p className="mt-1 text-muted-foreground">
            Publica una convocatoria para que los candidatos puedan postular y rendir su batería.
          </p>
        </div>
        <NewJobDialog assessments={assessments ?? []} />
      </div>

      {!jobs?.length ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Aún no hay convocatorias</CardTitle>
            <CardDescription>Crea la primera con el botón de arriba.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {jobs.map((job) => {
            const stats = byJob.get(job.id) ?? { total: 0, completed: 0 };
            return (
              <Card key={job.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {job.title}
                    <Badge variant={job.status === "published" ? "default" : "outline"}>
                      {STATUS_LABEL[job.status]}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(job.assessments as any)?.name} · Creada el {formatDate(job.created_at)} ·{" "}
                    {stats.total} {stats.total === 1 ? "postulante" : "postulantes"} ·{" "}
                    {stats.completed} con evaluación completa
                  </CardDescription>
                </CardHeader>

                <div className="flex flex-wrap items-center gap-2 px-(--card-spacing)">
                  <Button
                    size="sm"
                    render={<Link href={`/admin/convocatorias/${job.id}`} />}
                  >
                    Ver candidatos
                  </Button>
                  <JobStatusToggle jobId={job.id} status={job.status} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
