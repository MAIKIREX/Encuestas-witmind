import { requireAdmin } from "@/lib/dal";
import { applicationStatusLabel, formatDuration, integrityLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AttemptResponse, TestItem, TestItemOption } from "@/lib/supabase/types";

type LikertLabel = { value: number; label: string };

function likertLabelsFromConfig(config: unknown): LikertLabel[] {
  if (!config || typeof config !== "object" || Array.isArray(config)) return [];
  const labels = (config as { likert_labels?: unknown }).likert_labels;
  if (!Array.isArray(labels)) return [];
  return labels.filter(
    (label): label is LikertLabel =>
      typeof label === "object" &&
      label !== null &&
      typeof label.value === "number" &&
      typeof label.label === "string",
  );
}

// Celdas de tabla Markdown: sin saltos de línea ni pipes sueltos.
function cell(value: unknown) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return text.replace(/\r?\n+/g, " ").replace(/\|/g, "\\|").trim();
}

function utc(iso: string | null | undefined) {
  if (!iso) return "—";
  return `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function optionText(option: TestItemOption | undefined) {
  if (!option) return "Opción no disponible";
  return /^[a-z]$/i.test(option.code) ? `${option.code.toLowerCase()}) ${option.label}` : option.label;
}

function answerText(
  response: AttemptResponse | undefined,
  item: TestItem,
  options: TestItemOption[],
  likertLabels: LikertLabel[],
) {
  if (!response) return "Sin respuesta";
  const byId = (id: string | null) => options.find((option) => option.id === id);

  if (item.item_type === "forced_choice") {
    const most = response.option_id ? optionText(byId(response.option_id)) : "Sin respuesta";
    const least = response.least_option_id ? ` · Menos: ${optionText(byId(response.least_option_id))}` : "";
    return `Más: ${most}${least}`;
  }
  if (item.item_type === "free_response") {
    return response.value_text ?? response.value_numeric?.toString() ?? "Sin respuesta";
  }
  if (item.item_type === "likert") {
    if (response.value_numeric === null) return "Sin respuesta";
    const label = likertLabels.find((entry) => entry.value === response.value_numeric)?.label;
    return label ? `${response.value_numeric} (${label})` : String(response.value_numeric);
  }
  return response.option_id ? optionText(byId(response.option_id)) : "Sin respuesta";
}

function slug(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "candidato"
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, candidate_id, status, applied_at, completed_at, job_postings(id, title)")
    .eq("id", id)
    .maybeSingle();

  if (!application) return new Response("Postulación no encontrada", { status: 404 });

  const [{ data: profile }, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("full_name, doc_number, phone").eq("id", application.candidate_id).maybeSingle(),
    supabase
      .from("test_attempts")
      .select(
        "id, test_id, status, started_at, submitted_at, duration_seconds, integrity_level, tests(name, scoring_config), attempt_scores(raw_score, max_score, percent, band)",
      )
      .eq("application_id", id)
      .order("started_at", { ascending: true }),
  ]);

  const attemptIds = (attempts ?? []).map((a) => a.id);
  const testIds = [...new Set((attempts ?? []).map((a) => a.test_id))];

  const [{ data: subscales }, { data: responses }, { data: items }] = await Promise.all([
    attemptIds.length
      ? supabase
          .from("attempt_subscale_scores")
          .select("attempt_id, raw_score, max_score, percent, band, test_subscales(code, name, display_order)")
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    attemptIds.length
      ? supabase
          .from("attempt_responses")
          .select("attempt_id, item_id, option_id, value_numeric, value_text, least_option_id, answered_at, client_elapsed_ms, revisions")
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    testIds.length
      ? supabase
          .from("test_items")
          .select("id, test_id, position, item_type, stem, media_url, subscale_id, time_limit_seconds, config, is_active")
          .in("test_id", testIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const itemIds = (items ?? []).map((item) => item.id);
  const [{ data: options }, { data: testSubscales }] = await Promise.all([
    itemIds.length
      ? supabase
          .from("test_item_options")
          .select("id, item_id, code, label, media_url, display_order")
          .in("item_id", itemIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    testIds.length
      ? supabase.from("test_subscales").select("id, name").in("test_id", testIds)
      : Promise.resolve({ data: [] }),
  ]);

  const subscaleName = new Map((testSubscales ?? []).map((s) => [s.id, s.name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = application.job_postings as any;
  const candidate = profile?.full_name || "Candidato sin nombre";

  const lines: string[] = [];
  lines.push(`# Cuestionario del postulante — ${candidate}`, "");
  lines.push(`- **Vacante:** ${job?.title ?? "—"}`);
  if (profile?.doc_number) lines.push(`- **Documento:** ${profile.doc_number}`);
  if (profile?.phone) lines.push(`- **Teléfono:** ${profile.phone}`);
  lines.push(`- **Estado de la postulación:** ${applicationStatusLabel(application.status)}`);
  lines.push(
    `- **Postuló:** ${utc(application.applied_at)} · **Finalizó:** ${utc(application.completed_at)}`,
  );
  lines.push(`- **Postulación:** \`${application.id}\``, "");

  const list = attempts ?? [];

  lines.push("## Resumen de resultados", "");
  if (!list.length) {
    lines.push("El candidato aún no ha iniciado la evaluación.", "");
  } else {
    lines.push("| Prueba | Puntaje | % | Nivel | Duración | Integridad |", "|---|---|---|---|---|---|");
    for (const attempt of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const test = attempt.tests as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const score = attempt.attempt_scores as any;
      const integrity =
        attempt.status === "disqualified" ? "Prueba descalificada" : integrityLabel(attempt.integrity_level);
      lines.push(
        `| ${cell(test?.name)} | ${score ? `${score.raw_score} / ${score.max_score}` : "—"} | ${
          score?.percent !== null && score?.percent !== undefined ? `${score.percent}%` : "—"
        } | ${cell(score?.band)} | ${cell(attempt.duration_seconds === null ? null : formatDuration(attempt.duration_seconds))} | ${cell(integrity)} |`,
      );
    }
    lines.push("");
  }

  for (const attempt of list) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const test = attempt.tests as any;
    const subs = (subscales ?? [])
      .filter((s) => s.attempt_id === attempt.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.test_subscales?.display_order ?? 0) - (b.test_subscales?.display_order ?? 0));
    const testItems = (items ?? []).filter((item) => item.test_id === attempt.test_id);
    const attemptResponses = new Map(
      (responses ?? []).filter((r) => r.attempt_id === attempt.id).map((r) => [r.item_id, r]),
    );
    const likert = likertLabelsFromConfig(test?.scoring_config);
    const hasSubscales = testItems.some((item) => item.subscale_id);

    lines.push(`## ${cell(test?.name)}`, "");

    if (subs.length) {
      lines.push("### Subescalas", "", "| Subescala | Código | Bruto | % | Nivel |", "|---|---|---|---|---|");
      for (const s of subs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ts = (s as any).test_subscales;
        lines.push(
          `| ${cell(ts?.name)} | ${cell(ts?.code)} | ${s.raw_score} / ${s.max_score} | ${s.percent}% | ${cell(s.band)} |`,
        );
      }
      lines.push("");
    }

    lines.push(`### Respuestas (${testItems.length} ítems)`, "");
    if (!testItems.length) {
      lines.push("Sin ítems registrados.", "");
      continue;
    }
    if (likert.length) {
      lines.push(
        `Escala: ${[...likert].sort((a, b) => a.value - b.value).map((l) => `${l.value} = ${l.label}`).join(" · ")}`,
        "",
      );
    }
    lines.push(
      hasSubscales ? "| # | Pregunta | Subescala | Respuesta |" : "| # | Pregunta | Respuesta |",
      hasSubscales ? "|---|---|---|---|" : "|---|---|---|",
    );
    testItems.forEach((item, index) => {
      const answer = answerText(
        attemptResponses.get(item.id),
        item,
        (options ?? []).filter((o) => o.item_id === item.id),
        likert,
      );
      const scale = item.subscale_id ? subscaleName.get(item.subscale_id) : null;
      lines.push(
        hasSubscales
          ? `| ${index + 1} | ${cell(item.stem)} | ${cell(scale)} | ${cell(answer)} |`
          : `| ${index + 1} | ${cell(item.stem)} | ${cell(answer)} |`,
      );
    });
    lines.push("");
  }

  const filename = `Cuestionario_${slug(candidate)}_${slug(job?.title ?? "vacante")}.md`;

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
