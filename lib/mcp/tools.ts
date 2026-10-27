// Herramientas MCP de solo lectura sobre los datos de la plataforma. Las comparten
// el servidor stdio local (`mcp/server.ts`) y el endpoint HTTP (`app/api/mcp`).
//
// Reciben un cliente service_role (salta RLS): solo hacen lecturas y nunca
// devuelven datos sensibles del candidato (documento, telefono, fecha de nacimiento)
// ni claves de respuesta.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../supabase/types";

const MAX_LIMIT = 200;

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

type QueryResult = { data: unknown; error: { message: string } | null };

// Consultas de lista: sin error, `data` siempre viene presente.
function unwrap<R extends QueryResult>(result: R): NonNullable<R["data"]> {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<R["data"]>;
}

// `.maybeSingle()`: la ausencia de fila es válida y devuelve null.
function unwrapMaybe<R extends QueryResult>(result: R): R["data"] {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

export function createPlatformMcpServer(db: SupabaseClient<Database>) {
  const server = new McpServer({ name: "plataforma", version: "0.1.0" });

  server.registerTool(
    "list_job_postings",
    {
      title: "Listar convocatorias",
      description: "Lista las convocatorias (job_postings) con su estado y la evaluación asociada.",
      inputSchema: {
        status: z.enum(["draft", "published", "closed"]).optional().describe("Filtrar por estado"),
      },
      annotations: readOnly,
    },
    async ({ status }) => {
      let query = db
        .from("job_postings")
        .select("id, slug, title, location, employment_type, status, is_internal, assessment_id, published_at, closes_at")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      return json(unwrap(await query));
    },
  );

  server.registerTool(
    "list_tests",
    {
      title: "Listar pruebas",
      description:
        "Lista las pruebas psicométricas (tests) con su estrategia de puntaje, tiempo y cantidad de ítems activos. No incluye claves de respuesta.",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const tests = unwrap(
        await db
          .from("tests")
          .select("id, slug, version, name, description, scoring_strategy, is_timed, time_limit_seconds, is_active")
          .order("name"),
      );
      const items = unwrap(await db.from("test_items").select("test_id").eq("is_active", true));
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item.test_id, (counts.get(item.test_id) ?? 0) + 1);
      return json(tests.map((test) => ({ ...test, active_items: counts.get(test.id) ?? 0 })));
    },
  );

  server.registerTool(
    "list_applications",
    {
      title: "Listar postulaciones",
      description:
        "Lista postulaciones con el nombre del candidato. Excluye por defecto las de vista previa de administrador (is_test).",
      inputSchema: {
        job_posting_id: z.string().uuid().optional().describe("Filtrar por convocatoria"),
        status: z
          .enum(["applied", "in_progress", "completed", "shortlisted", "rejected", "hired"])
          .optional()
          .describe("Filtrar por estado de la postulación"),
        include_test: z.boolean().default(false).describe("Incluir postulaciones de prueba (is_test)"),
        limit: z.number().int().min(1).max(MAX_LIMIT).default(50),
      },
      annotations: readOnly,
    },
    async ({ job_posting_id, status, include_test, limit }) => {
      let query = db
        .from("applications")
        .select("id, candidate_id, job_posting_id, status, applied_at, completed_at, is_test")
        .order("applied_at", { ascending: false })
        .limit(limit);
      if (job_posting_id) query = query.eq("job_posting_id", job_posting_id);
      if (status) query = query.eq("status", status);
      if (!include_test) query = query.eq("is_test", false);
      const applications = unwrap(await query);

      const candidateIds = [...new Set(applications.map((a) => a.candidate_id))];
      const profiles = candidateIds.length
        ? unwrap(await db.from("profiles").select("id, full_name").in("id", candidateIds))
        : [];
      const names = new Map(profiles.map((p) => [p.id, p.full_name]));

      return json(
        applications.map(({ candidate_id, ...rest }) => ({
          ...rest,
          candidate_name: names.get(candidate_id) ?? null,
        })),
      );
    },
  );

  server.registerTool(
    "get_application_results",
    {
      title: "Resultados de una postulación",
      description:
        "Devuelve, para una postulación, cada intento de prueba con puntaje total, subescalas, banda, integridad (proctoring) y notas del administrador.",
      inputSchema: {
        application_id: z.string().uuid().describe("ID de la postulación"),
      },
      annotations: readOnly,
    },
    async ({ application_id }) => {
      const application = unwrapMaybe(
        await db
          .from("applications")
          .select("id, candidate_id, job_posting_id, status, applied_at, completed_at, admin_notes, is_test")
          .eq("id", application_id)
          .maybeSingle(),
      );
      if (!application) return fail(`No existe la postulación ${application_id}.`);

      const [profile, job, attempts] = await Promise.all([
        db.from("profiles").select("full_name").eq("id", application.candidate_id).maybeSingle(),
        db.from("job_postings").select("title").eq("id", application.job_posting_id).maybeSingle(),
        db
          .from("test_attempts")
          .select(
            "id, test_id, status, started_at, submitted_at, duration_seconds, integrity_level, events_warn, events_critical, integrity_strikes, disqualification_reason",
          )
          .eq("application_id", application_id)
          .order("started_at"),
      ]);
      const attemptRows = unwrap(attempts);
      const attemptIds = attemptRows.map((a) => a.id);
      const testIds = [...new Set(attemptRows.map((a) => a.test_id))];

      const [tests, scores, subscaleScores] = attemptIds.length
        ? await Promise.all([
            db.from("tests").select("id, name").in("id", testIds),
            db
              .from("attempt_scores")
              .select("attempt_id, raw_score, max_score, percent, percentile, band, norm_n")
              .in("attempt_id", attemptIds),
            db
              .from("attempt_subscale_scores")
              .select("attempt_id, subscale_id, raw_score, max_score, percent, percentile, band")
              .in("attempt_id", attemptIds),
          ])
        : [null, null, null];

      const testNames = new Map((tests ? unwrap(tests) : []).map((t) => [t.id, t.name]));
      const scoreByAttempt = new Map((scores ? unwrap(scores) : []).map((s) => [s.attempt_id, s]));
      const subscaleRows = subscaleScores ? unwrap(subscaleScores) : [];

      const subscaleIds = [...new Set(subscaleRows.map((s) => s.subscale_id))];
      const subscales = subscaleIds.length
        ? unwrap(await db.from("test_subscales").select("id, code, name").in("id", subscaleIds))
        : [];
      const subscaleInfo = new Map(subscales.map((s) => [s.id, s]));

      return json({
        application: {
          id: application.id,
          status: application.status,
          applied_at: application.applied_at,
          completed_at: application.completed_at,
          is_test: application.is_test,
          admin_notes: application.admin_notes,
          candidate_name: unwrapMaybe(profile)?.full_name ?? null,
          job_title: unwrapMaybe(job)?.title ?? null,
        },
        attempts: attemptRows.map(({ test_id, ...attempt }) => ({
          ...attempt,
          test: testNames.get(test_id) ?? test_id,
          score: scoreByAttempt.get(attempt.id) ?? null,
          subscales: subscaleRows
            .filter((s) => s.attempt_id === attempt.id)
            .map((s) => ({
              code: subscaleInfo.get(s.subscale_id)?.code ?? null,
              name: subscaleInfo.get(s.subscale_id)?.name ?? null,
              raw_score: s.raw_score,
              max_score: s.max_score,
              percent: s.percent,
              percentile: s.percentile,
              band: s.band,
            })),
        })),
      });
    },
  );

  server.registerTool(
    "get_job_summary",
    {
      title: "Resumen de una convocatoria",
      description:
        "Resumen de una convocatoria: postulaciones por estado y puntaje promedio por prueba (solo intentos calificados, sin postulaciones de prueba).",
      inputSchema: {
        job_posting_id: z.string().uuid().describe("ID de la convocatoria"),
      },
      annotations: readOnly,
    },
    async ({ job_posting_id }) => {
      const job = unwrapMaybe(
        await db
          .from("job_postings")
          .select("id, title, status, assessment_id")
          .eq("id", job_posting_id)
          .maybeSingle(),
      );
      if (!job) return fail(`No existe la convocatoria ${job_posting_id}.`);

      const applications = unwrap(
        await db
          .from("applications")
          .select("id, status")
          .eq("job_posting_id", job_posting_id)
          .eq("is_test", false),
      );
      const byStatus: Record<string, number> = {};
      for (const a of applications) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

      const applicationIds = applications.map((a) => a.id);
      const attempts = applicationIds.length
        ? unwrap(
            await db
              .from("test_attempts")
              .select("id, test_id")
              .in("application_id", applicationIds)
              .eq("status", "scored"),
          )
        : [];
      const scores = attempts.length
        ? unwrap(
            await db
              .from("attempt_scores")
              .select("attempt_id, percent")
              .in("attempt_id", attempts.map((a) => a.id)),
          )
        : [];
      const percentByAttempt = new Map(scores.map((s) => [s.attempt_id, s.percent]));

      const testIds = [...new Set(attempts.map((a) => a.test_id))];
      const tests = testIds.length
        ? unwrap(await db.from("tests").select("id, name").in("id", testIds))
        : [];

      const perTest = tests.map((test) => {
        const values = attempts
          .filter((a) => a.test_id === test.id)
          .map((a) => percentByAttempt.get(a.id))
          .filter((value): value is number => typeof value === "number");
        const average = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
        return {
          test: test.name,
          scored_attempts: values.length,
          average_percent: average === null ? null : Math.round(average * 10) / 10,
        };
      });

      return json({
        job: { id: job.id, title: job.title, status: job.status },
        total_applications: applications.length,
        applications_by_status: byStatus,
        tests: perTest,
      });
    },
  );

  return server;
}
