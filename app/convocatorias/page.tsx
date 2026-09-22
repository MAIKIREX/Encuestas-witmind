import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Clock,
  MapPin,
  Sparkles,
  Target,
  Timer,
  Users,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convocatorias abiertas · Evalua - witmind" };

const THEMES = [
  {
    cardClass: "tactile-card-forest",
    badgeClass: "bg-black/45 text-[#d9a771]",
    kickerClass: "text-[#d9a771]",
    Icon: Briefcase,
  },
  {
    cardClass: "tactile-card-terracotta",
    badgeClass: "bg-black/45 text-[#f5d09f]",
    kickerClass: "text-[#f5d09f]",
    Icon: Target,
  },
  {
    cardClass: "tactile-card-sage",
    badgeClass: "bg-white/20 text-white",
    kickerClass: "text-[#eef5ed]",
    Icon: Users,
  },
  {
    cardClass: "tactile-card-dark",
    badgeClass: "bg-black/55 text-[#d9a771]",
    kickerClass: "text-[#d9a771]",
    Icon: Sparkles,
  },
];

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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#672d15] text-[#fcfaf5]">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-96 w-full max-w-5xl rounded-full bg-gradient-to-b from-[#d9a771]/20 via-[#133827]/15 to-transparent blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/15 backdrop-blur-md mb-3">
            <Sparkles className="size-3.5 text-[#d9a771]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d9a771]">
              Oportunidades en Evalua - witmind
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Convocatorias abiertas
          </h1>
          <div className="mt-3 mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771]" />
          <p className="text-base text-[#e5d8cc] max-w-2xl leading-relaxed">
            Elige una vacante para conocer el perfil del puesto y las evaluaciones psicométricas que
            incluye el proceso de selección.
          </p>
        </div>

        {!jobs?.length ? (
          <div className="mt-10 tactile-card-forest p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="tactile-inset-badge size-16 bg-black/45 mb-4">
              <Briefcase className="size-8 text-[#d9a771] tactile-relief-icon" />
            </div>
            <h3 className="text-xl font-bold text-white">No hay convocatorias abiertas en este momento</h3>
            <p className="mt-2 text-sm text-[#d4c1b0] max-w-md">
              Vuelve más adelante: publicamos nuevas vacantes con frecuencia para distintas áreas profesionales.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4 sm:gap-5">
            {jobs.map((job, index) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tests = ((job.assessments as any)?.assessment_tests ?? []) as {
                tests: { time_limit_seconds: number | null } | null;
              }[];
              const total = tests.reduce((acc, t) => acc + (t.tests?.time_limit_seconds ?? 0), 0);
              const theme = THEMES[index % THEMES.length];
              const CardIcon = theme.Icon;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const assessmentName = (job.assessments as any)?.name;

              return (
                <div
                  key={job.id}
                  className={`${theme.cardClass} p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group rounded-[2rem]`}
                >
                  {/* 1. SECCIÓN IZQUIERDA: Insignia táctil + Título + Batería + Descripción */}
                  <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                    <div
                      className={`tactile-inset-badge size-13 sm:size-14 shrink-0 mt-0.5 ${theme.badgeClass}`}
                    >
                      <CardIcon className="size-6 sm:size-7 tactile-relief-icon" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider ${theme.kickerClass}`}
                        >
                          Vacante Abierta
                        </span>
                        <span className="text-white/30 text-xs">·</span>
                        <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Postulaciones activas</span>
                        </div>
                      </div>

                      <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug group-hover:text-[#d9a771] transition-colors truncate">
                        <Link href={`/convocatorias/${job.slug}`}>
                          {job.title}
                        </Link>
                      </h2>

                      {job.description && (
                        <p className="mt-1.5 text-xs sm:text-sm text-[#d4c1b0] leading-relaxed line-clamp-2 max-w-2xl">
                          {job.description}
                        </p>
                      )}

                      {assessmentName && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/12 text-xs text-[#e5d8cc]">
                          <Brain className="size-3.5 text-[#d9a771] shrink-0" />
                          <span className="truncate max-w-[280px] font-medium">{assessmentName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. SECCIÓN CENTRAL: Chips de Modalidad, Ubicación y Tiempo */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 lg:px-6 lg:border-x lg:border-white/10 text-xs">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 border border-white/10 px-3 py-1.5 text-[#e5eedf] font-medium text-[11px]">
                        <MapPin className="size-3.5 text-[#d9a771]" />
                        {job.location}
                      </span>
                    )}
                    {job.employment_type && (
                      <span className="inline-flex items-center rounded-full bg-black/35 border border-white/10 px-3 py-1.5 text-[#e5eedf] font-medium text-[11px]">
                        {job.employment_type}
                      </span>
                    )}
                    {total > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 border border-white/10 px-3 py-1.5 text-[#f5d09f] font-medium text-[11px]">
                        <Timer className="size-3.5 text-[#d9a771]" />
                        {formatMinutes(total)} de batería
                      </span>
                    )}
                  </div>

                  {/* 3. SECCIÓN DERECHA: Acción Ver Detalle */}
                  <div className="flex items-center justify-end shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    <Button
                      size="sm"
                      className="h-10 px-6 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs sm:text-sm shadow-[0_8px_18px_-4px_rgba(186,94,48,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                      render={<Link href={`/convocatorias/${job.slug}`} />}
                    >
                      Ver detalle
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
