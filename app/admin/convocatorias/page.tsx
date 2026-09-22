import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { JobStatusToggle } from "@/components/admin/job-status-toggle";
import { NewJobDialog } from "@/components/admin/new-job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convocatorias · Administración" };

const STATUS_CONFIG: Record<
  string,
  { label: string; kicker: string; badgeVariant: string; dotClass?: string }
> = {
  published: {
    label: "Publicada",
    kicker: "Convocatoria Activa",
    badgeVariant: "bg-emerald-950/70 text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-400 animate-pulse",
  },
  draft: {
    label: "Borrador",
    kicker: "En Preparación",
    badgeVariant: "bg-black/50 text-[#d4c1b0] border-white/15",
    dotClass: "bg-amber-400",
  },
  closed: {
    label: "Cerrada",
    kicker: "Concluida",
    badgeVariant: "bg-black/70 text-neutral-400 border-white/10",
  },
};

const THEMES = [
  {
    cardClass: "tactile-card-forest",
    badgeClass: "bg-black/45 text-[#d9a771]",
    kickerClass: "text-[#d9a771]",
    accentColor: "#d9a771",
    Icon: Briefcase,
  },
  {
    cardClass: "tactile-card-terracotta",
    badgeClass: "bg-black/45 text-[#f5d09f]",
    kickerClass: "text-[#f5d09f]",
    accentColor: "#f5d09f",
    Icon: Target,
  },
  {
    cardClass: "tactile-card-sage",
    badgeClass: "bg-white/20 text-white",
    kickerClass: "text-[#eef5ed]",
    accentColor: "#ffffff",
    Icon: Users,
  },
  {
    cardClass: "tactile-card-dark",
    badgeClass: "bg-black/55 text-[#d9a771]",
    kickerClass: "text-[#d9a771]",
    accentColor: "#d9a771",
    Icon: Sparkles,
  },
];

export default async function AdminConvocatoriasPage() {
  const supabase = await createClient();

  const [{ data: jobs }, { data: tests }] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id, slug, title, description, status, published_at, created_at, assessments(name)")
      .eq("is_internal", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("tests")
      .select("id, name, description, time_limit_seconds")
      .eq("is_active", true)
      .order("name"),
  ]);

  const { data: counts } = await supabase
    .from("applications")
    .select("job_posting_id, status")
    .eq("is_test", false);

  const byJob = new Map<string, { total: number; completed: number }>();
  for (const a of counts ?? []) {
    const entry = byJob.get(a.job_posting_id) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (a.status === "completed") entry.completed += 1;
    byJob.set(a.job_posting_id, entry);
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Encabezado con estética táctil */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/15 backdrop-blur-md mb-3">
            <Sparkles className="size-3.5 text-[#d9a771]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d9a771]">
              Gestión de Convocatorias
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Convocatorias de Talento
          </h1>
          <div className="mt-2.5 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771]" />
          <p className="mt-3 text-sm sm:text-base text-[#e5d8cc] max-w-2xl leading-relaxed">
            Publica y gestiona las vacantes de evaluación psicométrica. Los candidatos registrados
            rendirán automáticamente las baterías asignadas a cada perfil.
          </p>
        </div>
        <div className="shrink-0">
          <NewJobDialog tests={tests ?? []} />
        </div>
      </div>

      {/* Listado de tarjetas horizontales táctiles bien distribuidas */}
      {!jobs?.length ? (
        <div className="mt-10 tactile-card-forest p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="tactile-inset-badge size-16 bg-black/45 mb-4">
            <Briefcase className="size-8 text-[#d9a771] tactile-relief-icon" />
          </div>
          <h3 className="text-xl font-bold text-white">Aún no hay convocatorias registradas</h3>
          <p className="mt-2 text-sm text-[#d4c1b0] max-w-md">
            Crea tu primera convocatoria con el botón superior para empezar a recibir postulantes y evaluar sus competencias.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4 sm:gap-5">
          {jobs.map((job, index) => {
            const stats = byJob.get(job.id) ?? { total: 0, completed: 0 };
            const statusInfo = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.draft;
            const theme = THEMES[index % THEMES.length];
            const CardIcon = theme.Icon;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assessmentName = (job.assessments as any)?.name;

            return (
              <div
                key={job.id}
                className={`${theme.cardClass} p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group rounded-[2rem]`}
              >
                {/* 1. SECCIÓN IZQUIERDA: Insignia táctil + Título + Batería + Kicker */}
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
                        {statusInfo.kicker}
                      </span>
                      <span className="text-white/30 text-xs">·</span>
                      <span className="text-[11px] text-white/70 flex items-center gap-1">
                        <Clock className="size-3 text-[#d9a771]" />
                        Creada el {formatDate(job.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug group-hover:text-[#d9a771] transition-colors truncate">
                      <Link href={`/admin/convocatorias/${job.id}`}>
                        {job.title}
                      </Link>
                    </h2>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/12 text-xs text-[#e5d8cc]">
                        <Brain className="size-3.5 text-[#d9a771] shrink-0" />
                        <span className="truncate max-w-[280px] font-medium">
                          {assessmentName ?? "Sin batería asignada"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN CENTRAL: Micro-Métricas de Postulantes y Evaluados */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 lg:px-6 lg:border-x lg:border-white/10">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs min-w-[125px]">
                    <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Users className="size-4 text-[#d9a771]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4c1b0]/80 block leading-tight">
                        Postulantes
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-white block leading-tight mt-0.5">
                        {stats.total}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs min-w-[125px]">
                    <div className="size-9 rounded-xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4c1b0]/80 block leading-tight">
                        Evaluados
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-white block leading-tight mt-0.5">
                        {stats.completed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. SECCIÓN DERECHA: Estado + Acciones */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-xs ${statusInfo.badgeVariant}`}
                  >
                    {statusInfo.dotClass && (
                      <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                    )}
                    {statusInfo.label}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-9 px-4 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs shadow-[0_8px_18px_-4px_rgba(186,94,48,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                      render={<Link href={`/admin/convocatorias/${job.id}`} />}
                    >
                      Ver candidatos
                      <ArrowRight className="size-3.5" />
                    </Button>

                    <JobStatusToggle
                      jobId={job.id}
                      status={job.status}
                      className="h-9 px-3.5 rounded-full bg-black/40 border border-white/20 text-[#fcfaf5] text-xs hover:bg-black/60 hover:text-white backdrop-blur-md transition-all"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
