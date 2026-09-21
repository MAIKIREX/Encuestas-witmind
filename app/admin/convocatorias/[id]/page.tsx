import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applicationStatusLabel, formatDate, formatDuration, integrityLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Candidatos · Administración" };

export default async function AdminJobPage({ params }: PageProps<"/admin/convocatorias/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_postings")
    .select("id, title, status, assessments(name, assessment_tests(position, tests(id, name)))")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batteryTests = [...((job.assessments as any)?.assessment_tests ?? [])].sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.position - b.position,
  );

  const { data: applications } = await supabase
    .from("applications")
    .select("id, candidate_id, status, applied_at, completed_at")
    .eq("job_posting_id", id)
    .order("applied_at", { ascending: false });

  const candidateIds = [...new Set((applications ?? []).map((a) => a.candidate_id))];
  const applicationIds = (applications ?? []).map((a) => a.id);

  const [{ data: profiles }, { data: attempts }] = await Promise.all([
    candidateIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", candidateIds)
      : Promise.resolve({ data: [] }),
    applicationIds.length
      ? supabase
          .from("test_attempts")
          .select(
            "id, application_id, test_id, status, duration_seconds, integrity_level, attempt_scores(percent, percentile, band)",
          )
          .in("application_id", applicationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  type Row = {
    percentByTest: Map<string, number | null>;
    totalSeconds: number;
    scoredCount: number;
    worstIntegrity: string;
  };
  const rows = new Map<string, Row>();

  for (const at of attempts ?? []) {
    const row = rows.get(at.application_id) ?? {
      percentByTest: new Map<string, number | null>(),
      totalSeconds: 0,
      scoredCount: 0,
      worstIntegrity: "info",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const score = at.attempt_scores as any;
    row.percentByTest.set(at.test_id, score?.percent ?? null);
    row.totalSeconds += at.duration_seconds ?? 0;
    if (at.status === "scored") row.scoredCount += 1;
    if (at.integrity_level === "critical") row.worstIntegrity = "critical";
    else if (at.integrity_level === "warn" && row.worstIntegrity !== "critical")
      row.worstIntegrity = "warn";
    rows.set(at.application_id, row);
  }

  // Ranking por promedio de las pruebas ya calificadas.
  const ranked = [...(applications ?? [])]
    .map((app) => {
      const row = rows.get(app.id);
      const percents = [...(row?.percentByTest.values() ?? [])].filter(
        (p): p is number => p !== null,
      );
      const avg = percents.length
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : null;
      return { app, row, avg };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/admin/convocatorias" className="text-sm text-muted-foreground hover:underline">
        ← Volver a convocatorias
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-medium">{job.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(job.assessments as any)?.name} · {applications?.length ?? 0} postulantes
      </p>

      {!applications?.length ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Todavía no hay postulantes</CardTitle>
            <CardDescription>
              {job.status === "published"
                ? "La convocatoria está publicada y visible para los candidatos."
                : "Publica la convocatoria para que los candidatos puedan postular."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead className="text-right">Promedio</TableHead>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {batteryTests.map((t: any) => (
                  <TableHead key={t.tests?.id} className="text-right whitespace-nowrap">
                    {t.tests?.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Tiempo</TableHead>
                <TableHead>Integridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {ranked.map(({ app, row, avg }) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">
                    {nameById.get(app.candidate_id) || "Sin nombre"}
                    <div className="text-xs text-muted-foreground">
                      Postuló el {formatDate(app.applied_at)}
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {avg === null ? "—" : `${avg}%`}
                  </TableCell>

                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {batteryTests.map((t: any) => {
                    const p = row?.percentByTest.get(t.tests?.id);
                    return (
                      <TableCell key={t.tests?.id} className="text-right tabular-nums">
                        {p === null || p === undefined ? "—" : `${p}%`}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {row?.totalSeconds ? formatDuration(row.totalSeconds) : "—"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        row?.worstIntegrity === "critical"
                          ? "destructive"
                          : row?.worstIntegrity === "warn"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {integrityLabel(row?.worstIntegrity ?? "info")}
                    </Badge>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {applicationStatusLabel(app.status)}
                  </TableCell>

                  <TableCell>
                    <Button
                      size="xs"
                      variant="outline"
                      render={<Link href={`/admin/postulaciones/${app.id}`} />}
                    >
                      Informe
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
