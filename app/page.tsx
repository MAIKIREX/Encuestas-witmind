import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, Sparkles, Timer } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { HeroSpaceAnimation } from "@/components/hero-space-animation";
import { StepCard } from "@/components/step-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Postula a una convocatoria",
    body: "Revisa las vacantes abiertas, lee el perfil y postula con tu cuenta. El proceso toma menos de un minuto.",
  },
  {
    icon: Timer,
    step: "02",
    title: "Rinde tu evaluación",
    body: "Cada convocatoria tiene una batería de pruebas que se rinden en orden. Puedes pausar entre pruebas a tu propio ritmo.",
  },
  {
    icon: FileSearch,
    step: "03",
    title: "Revisión objetiva del perfil",
    body: "Tus respuestas se procesan con baremos estandarizados y el equipo de selección revisa tus resultados en tiempo real.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-background">
      <SiteHeader />

      <main className="flex-1 w-full">
        {/* HERO PRINCIPAL A PANTALLA COMPLETA (FULL-WIDTH EDGE-TO-EDGE) */}
        <section className="relative w-full overflow-hidden border-b border-border/50 bg-background">
          <div className="w-full grid lg:grid-cols-12 min-h-[580px] lg:min-h-[660px] xl:min-h-[720px] items-stretch">
            {/* COLUMNA IZQUIERDA: FONDO BLANCO HASTA EL BORDE IZQUIERDO */}
            <div className="lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 lg:pl-16 xl:pl-24 lg:pr-12 py-12 sm:py-16 lg:py-20 relative z-10 bg-background">
              {/* Marca de agua tipográfica de fondo */}
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute top-12 left-6 lg:left-12 text-7xl sm:text-8xl xl:text-9xl font-black text-foreground/[0.03] uppercase tracking-tighter -z-0"
              >
                evalua
              </div>

              <div className="w-full max-w-xl xl:max-w-2xl relative z-10">
                {/* Kicker superior */}
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  <Sparkles className="size-3.5" />
                  <span>selección inteligente</span>
                </div>

                {/* Título, acento y descripción */}
                <div className="mt-4 mb-6">
                  <p className="text-xs sm:text-sm font-medium tracking-wide text-muted-foreground/80">
                    impulsa tu carrera
                  </p>
                  <h1 className="mt-1 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground text-balance">
                    evaluaciones que miden tu potencial real
                  </h1>

                  {/* Barra de acento píldora (identificativa de la referencia) */}
                  <div className="mt-3.5 mb-5 h-1.5 w-10 rounded-full bg-primary" />

                  <p className="max-w-lg text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Postula a convocatorias abiertas y rinde pruebas psicométricas y de criterio en
                    línea. Un proceso ágil, transparente y con resultados inmediatos.
                  </p>

                  {/* Acciones en píldora */}
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button size="lg" render={<Link href="/convocatorias" />}>
                      Ver convocatorias
                      <ArrowRight data-icon="inline-end" className="size-4" />
                    </Button>
                    <Button size="lg" variant="outline" render={<Link href="/registro" />}>
                      Crear cuenta
                    </Button>
                  </div>

                  {count !== null && count > 0 && (
                    <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {count === 1
                          ? "1 convocatoria abierta ahora mismo"
                          : `${count} convocatorias abiertas ahora mismo`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Micro-enlaces al pie */}
                <div className="pt-4 border-t border-border/40 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    100% confidencial
                  </span>
                  <span>·</span>
                  <span>baterías psicométricas oficiales</span>
                  <span>·</span>
                  <span>sin traslados</span>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: SILUETA AZUL LIMPIA HASTA EL BORDE DERECHO */}
            <div className="lg:col-span-5 relative min-h-[300px] sm:min-h-[380px] lg:min-h-full bg-gradient-to-br from-[#0b2b40] via-[#0d344d] to-[#082030] overflow-hidden">
              {/* Ola divisoria SVG en desktop (fluye desde la columna blanca hacia el azul) */}
              <div className="hidden lg:block absolute inset-y-0 left-0 -ml-px w-28 xl:w-36 z-20 pointer-events-none organic-wave-shadow">
                <svg
                  viewBox="0 0 100 800"
                  fill="none"
                  preserveAspectRatio="none"
                  className="h-full w-full text-background fill-current"
                >
                  <path d="M0,0 L0,800 C40,710 85,590 45,430 C12,280 75,150 25,50 C15,22 0,0 0,0 Z" />
                </svg>
              </div>

              {/* Ola divisoria SVG en móvil (horizontal) */}
              <div className="lg:hidden absolute top-0 inset-x-0 h-16 z-20 pointer-events-none">
                <svg
                  viewBox="0 0 600 100"
                  fill="none"
                  preserveAspectRatio="none"
                  className="h-full w-full text-background fill-current"
                >
                  <path d="M0,0 L600,0 L600,30 C450,75 320,10 180,65 C90,85 0,30 0,30 Z" />
                </svg>
              </div>

              {/* Animación espacial sutil y elegante */}
              <HeroSpaceAnimation mode="constellation" />
            </div>
          </div>
        </section>

        {/* SECCIÓN DE PASOS CON TARJETAS REDONDEADAS */}
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              proceso simple
            </span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              ¿Cómo funciona la evaluación?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Diseñado para que rindas tus pruebas con comodidad, claridad y sin complicaciones.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((stepItem, index) => (
              <StepCard
                key={stepItem.title}
                index={index}
                icon={stepItem.icon}
                step={stepItem.step}
                title={stepItem.title}
                body={stepItem.body}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 bg-background/60 backdrop-blur-xs">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-5xl px-4 sm:px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-foreground">evalua</span>
            <span>— plataforma de evaluación para procesos de selección.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/convocatorias" className="hover:underline">
              Convocatorias
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:underline">
              Ingreso
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
