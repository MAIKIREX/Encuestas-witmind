import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Clock,
  FileQuestion,
  Sparkles,
} from "lucide-react";

import { TestModeButton } from "@/components/test-mode-button";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Banco de pruebas · Administración" };

const STRATEGY_LABEL: Record<string, string> = {
  key_sum: "Opción múltiple con clave",
  key_sum_subscale: "Opción múltiple con subescalas",
  likert_reverse: "Escala Likert con ítems inversos",
  likert_reverse_normed: "Escala Likert con baremos",
  sjt_weighted: "Juicio situacional con puntuación ponderada",
  ipsative: "Elección forzada",
};

function formatStrategy(strategy: string) {
  if (STRATEGY_LABEL[strategy]) return STRATEGY_LABEL[strategy];
  return strategy.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getTestTheme(slug?: string, strategy?: string, index: number = 0) {
  const s = (slug ?? "").toLowerCase();
  const strat = (strategy ?? "").toLowerCase();

  if (s.includes("raven") || s.includes("matriz") || s.includes("abstract")) {
    return {
      cardClass: "tactile-card-forest",
      kickerClass: "text-[#d9a771]",
      category: "Razonamiento Abstracto",
    };
  }
  if (
    s.includes("wonderlic") ||
    s.includes("mate") ||
    s.includes("calculo") ||
    s.includes("logica") ||
    strat.includes("key_sum")
  ) {
    return {
      cardClass: "tactile-card-terracotta",
      kickerClass: "text-[#f5d09f]",
      category: "Agilidad Cognitiva",
    };
  }
  if (
    s.includes("bfq") ||
    s.includes("personalidad") ||
    s.includes("ppg") ||
    strat.includes("likert")
  ) {
    return {
      cardClass: "tactile-card-sage",
      kickerClass: "text-[#eef5ed]",
      category: "Personalidad & Conducta",
    };
  }
  if (
    s.includes("liderazgo") ||
    s.includes("sjt") ||
    strat.includes("sjt") ||
    strat.includes("ipsative")
  ) {
    return {
      cardClass: "tactile-card-dark",
      kickerClass: "text-[#d9a771]",
      category: "Juicio Situacional",
    };
  }
  if (s.includes("detalle") || s.includes("atencion") || s.includes("instrucc")) {
    return {
      cardClass: "tactile-card-terracotta",
      kickerClass: "text-[#f5d09f]",
      category: "Atención & Precisión",
    };
  }

  const fallbackThemes = [
    {
      cardClass: "tactile-card-forest",
      kickerClass: "text-[#d9a771]",
      category: "Evaluación Estandarizada",
    },
    {
      cardClass: "tactile-card-terracotta",
      kickerClass: "text-[#f5d09f]",
      category: "Evaluación Cuantitativa",
    },
    {
      cardClass: "tactile-card-sage",
      kickerClass: "text-[#eef5ed]",
      category: "Perfil de Competencias",
    },
    {
      cardClass: "tactile-card-dark",
      kickerClass: "text-[#d9a771]",
      category: "Juicio Profesional",
    },
  ];

  return fallbackThemes[index % fallbackThemes.length];
}

export default async function AdminTestsPage() {
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, slug, name, description, source, scoring_strategy, time_limit_seconds, is_active, test_items(count), assessment_tests(assessments(name))",
    )
    .order("name");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Encabezado armónico con el index */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md mb-3">
            <Sparkles className="size-3.5 text-[#d9a771]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d9a771]">
              Banco de Evaluaciones Psicométricas
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Banco de Pruebas
          </h1>
          <div className="mt-2.5 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771]" />
          <p className="mt-3 text-sm sm:text-base text-[#e5d8cc] max-w-2xl leading-relaxed">
            Cada prueba es un conjunto de preguntas y reactivos psicométricos con algoritmo propio
            de calificación. Las claves de respuesta y baremos se procesan de forma segura fuera del alcance de la API pública.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs text-xs sm:text-sm text-[#d9a771] w-fit shadow-md">
          <span className="size-2 rounded-full bg-[#5c7953] animate-pulse" />
          <span>
            {tests?.length ?? 0} {tests?.length === 1 ? "prueba disponible" : "pruebas disponibles"}
          </span>
        </div>
      </div>

      {/* Listado de tarjetas limpias, centradas y sin íconos pesados a la izquierda */}
      {!tests?.length ? (
        <div className="mt-10 tactile-card-forest p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="tactile-inset-badge size-16 bg-black/45 mb-4">
            <Brain className="size-8 text-[#d9a771] tactile-relief-icon" />
          </div>
          <h3 className="text-xl font-bold text-white">No hay pruebas configuradas</h3>
          <p className="mt-2 text-sm text-[#d4c1b0] max-w-md">
            Importa o registra una batería psicométrica para comenzar a evaluar candidatos.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4 sm:gap-5">
          {tests.map((test, index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemCount = (test.test_items as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usedIn = ((test.assessment_tests as any) ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((at: any) => at.assessments?.name)
              .filter(Boolean);

            const theme = getTestTheme(test.slug, test.scoring_strategy, index);

            return (
              <div
                key={test.id}
                className={`${theme.cardClass} p-6 sm:p-7 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group rounded-[2rem]`}
              >
                {/* 1. SECCIÓN PRINCIPAL (IZQUIERDA): Categoría + Título + Descripción + Baterías asignadas */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* Fila superior: Kicker de categoría, Estrategia y Badges de estado */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mb-1.5">
                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wider ${theme.kickerClass}`}
                    >
                      {theme.category}
                    </span>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-xs text-[#e5d8cc]/85 font-medium">
                      {formatStrategy(test.scoring_strategy)}
                    </span>

                    {test.source === "seed_licensed" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/45 text-[#d9a771] border border-white/15 backdrop-blur-xs">
                        Instrumento externo
                      </span>
                    )}

                    {!test.is_active && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/70 text-red-300 border border-red-500/30">
                        Inactiva
                      </span>
                    )}
                  </div>

                  {/* Título de la prueba */}
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug group-hover:text-[#d9a771] transition-colors">
                    <Link href={`/admin/tests/${test.id}`}>{test.name}</Link>
                  </h2>

                  {/* Descripción de la prueba */}
                  {test.description && (
                    <p className="mt-2 text-xs sm:text-sm text-[#e5d8cc] leading-relaxed max-w-3xl">
                      {test.description}
                    </p>
                  )}

                  {/* Baterías donde se utiliza */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    {usedIn.length > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/12 text-xs text-[#e5d8cc]">
                        <Brain className="size-3.5 text-[#d9a771] shrink-0" />
                        <span className="font-medium">
                          Se usa en:{" "}
                          <span className="text-white font-semibold">
                            {usedIn.join(", ")}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[11px] text-[#d4c1b0]/70">
                        <span>Disponible para asignar en convocatorias</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SECCIÓN CENTRAL: Micro-Métricas de Reactivos y Tiempo apiladas y centradas */}
                <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 lg:px-6 lg:border-x lg:border-white/10 self-stretch lg:self-center">
                  <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs w-full sm:w-40">
                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <FileQuestion className="size-3.5 text-[#d9a771]" />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4c1b0]/80 block leading-tight">
                        Reactivos
                      </span>
                      <span className="text-base font-extrabold text-white block leading-tight mt-0.5">
                        {itemCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs w-full sm:w-40">
                    <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Clock className="size-3.5 text-[#f5d09f]" />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4c1b0]/80 block leading-tight">
                        Duración
                      </span>
                      <span className="text-base font-extrabold text-white block leading-tight mt-0.5">
                        {formatMinutes(test.time_limit_seconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. SECCIÓN DERECHA: Acciones principales */}
                <div className="flex flex-row sm:flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <Button
                    size="sm"
                    className="h-10 px-5 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs sm:text-sm shadow-[0_8px_18px_-4px_rgba(186,94,48,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                    render={<Link href={`/admin/tests/${test.id}`} />}
                  >
                    Ver y editar preguntas
                    <ArrowRight className="size-4" />
                  </Button>

                  {test.is_active && (
                    <TestModeButton
                      testId={test.id}
                      className="h-10 px-4 rounded-full bg-black/40 border border-white/20 text-[#fcfaf5] text-xs sm:text-sm hover:bg-black/60 hover:text-white backdrop-blur-md transition-all"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
