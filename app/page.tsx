import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileSearch,
  Layers,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";

import { HeroBackgroundVideo } from "@/components/hero-background-video";
import { SiteHeader } from "@/components/site-header";
import { StepCard } from "@/components/step-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: <ClipboardList className="size-5" />,
    step: "01",
    title: "Postula a tu vacante en Evalua - witmind",
    body: "Selecciona la convocatoria abierta según tu perfil profesional y registra tu postulación en menos de un minuto.",
  },
  {
    icon: <Timer className="size-5" />,
    step: "02",
    title: "Rinde tus pruebas psicométricas",
    body: "Completa las evaluaciones en línea: Matrices de Raven, agilidad matemática Wonderlic y test de personalidad laboral a tu propio ritmo.",
  },
  {
    icon: <FileSearch className="size-5" />,
    step: "03",
    title: "Calificación objetiva y baremos",
    body: "Tus respuestas se procesan con baremos estandarizados para una selección justa, transparente y sin sesgos.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#672d15] text-[#fcfaf5]">
      {/* =========================================================================
          HERO A PANTALLA COMPLETA (FULL-WINDOW EDGE-TO-EDGE) CON VIDEO DE FONDO
          ========================================================================= */}
      <section className="relative w-full min-h-screen sm:min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-black">
        {/* 1. Video de fondo garantizado a pantalla completa */}
        <HeroBackgroundVideo />

        {/* 2. Barra de navegación flotante en la parte superior del hero */}
        <div className="relative z-20">
          <SiteHeader />
        </div>

        {/* 3. Contenido principal del Hero */}
        <div className="flex-1 flex items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 relative z-10">
          <div className="w-full grid md:grid-cols-12 items-center">
            <div className="md:col-start-6 md:col-span-7 lg:col-start-7 lg:col-span-6 flex flex-col justify-center">

              {/* Título principal con alto impacto visual */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.12] text-balance drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
                Evaluaciones psicométricas y selección de talento
              </h1>

              {/* Divisor en relieve con colores de la referencia */}
              <div className="mt-4 mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771] shadow-[0_2px_10px_rgba(217,167,113,0.5)]" />

              <p className="text-base sm:text-lg text-[#f0e4d7] leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] max-w-lg">
                Postula a nuestras convocatorias y rinde tus evaluaciones en línea de forma ágil, transparente y con resultados objetivos.
              </p>

              {/* Botones de acción tipo cápsula táctil */}
              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Button
                  size="lg"
                  className="h-12 px-7 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-sm sm:text-base shadow-[0_14px_30px_-6px_rgba(186,94,48,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  render={<Link href="/convocatorias" />}
                >
                  Ver convocatorias
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20 ml-2">
                    <ArrowRight className="size-3.5" />
                  </span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 rounded-full bg-black/40 border border-white/20 text-[#fcfaf5] text-sm sm:text-base hover:bg-black/60 hover:text-white backdrop-blur-md transition-all"
                  render={<Link href="/registro" />}
                >
                  Crear cuenta
                </Button>
              </div>

              {/* Contador en tiempo real de convocatorias abiertas */}
              {count !== null && count > 0 && (
                <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md text-xs text-[#d9a771] w-fit shadow-md">
                  <span className="size-2 rounded-full bg-[#5c7953] animate-pulse" />
                  <span>
                    {count === 1
                      ? "1 convocatoria abierta ahora mismo"
                      : `${count} convocatorias abiertas ahora mismo`}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 4. Indicador sutil de scroll hacia las baterías de evaluación */}
        <div className="relative z-10 pb-6 text-center">
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#d9a771]/80 animate-bounce block">
            ↓ Explora las evaluaciones
          </span>
        </div>
      </section>

      <main className="flex-1 w-full relative z-10">

        {/* =========================================================================
            BARRA PANORÁMICA Y REJILLA TÁCTIL DE 6 TARJETAS (ESTILO IMAGEN DE REFERENCIA)
            ========================================================================= */}
        <section className="relative w-full px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl flex flex-col items-center">
            
            {/* 1. BARRA PANORÁMICA SUPERIOR (CÁPSULA HORIZONTAL DE LA IMAGEN) */}
            <div className="tactile-pill-bar w-full max-w-2xl p-3.5 sm:p-4 mb-6 sm:mb-8">
              <div className="flex items-center justify-around">
                {/* Glifo 1: Raven */}
                <div className="group flex flex-col items-center cursor-pointer">
                  <div className="tactile-inset-badge size-12 sm:size-14 group-hover:border-[#d9a771]/60">
                    <Target className="size-6 text-[#fcfaf5] group-hover:text-[#d9a771] transition-colors" />
                  </div>
                  <span className="mt-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4c1b0] group-hover:text-white">
                    Raven
                  </span>
                </div>

                {/* Glifo 2: Lógica & Matemáticas */}
                <div className="group flex flex-col items-center cursor-pointer">
                  <div className="tactile-inset-badge size-12 sm:size-14 group-hover:border-[#d9a771]/60">
                    <Calculator className="size-6 text-[#fcfaf5] group-hover:text-[#d9a771] transition-colors" />
                  </div>
                  <span className="mt-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4c1b0] group-hover:text-white">
                    Lógica
                  </span>
                </div>

                {/* Glifo 3: Criterio & Perfil */}
                <div className="group flex flex-col items-center cursor-pointer">
                  <div className="tactile-inset-badge size-12 sm:size-14 group-hover:border-[#d9a771]/60">
                    <Brain className="size-6 text-[#fcfaf5] group-hover:text-[#d9a771] transition-colors" />
                  </div>
                  <span className="mt-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4c1b0] group-hover:text-white">
                    Perfil
                  </span>
                </div>

                {/* Glifo 4: Liderazgo */}
                <div className="group flex flex-col items-center cursor-pointer">
                  <div className="tactile-inset-badge size-12 sm:size-14 group-hover:border-[#d9a771]/60">
                    <Compass className="size-6 text-[#fcfaf5] group-hover:text-[#d9a771] transition-colors" />
                  </div>
                  <span className="mt-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4c1b0] group-hover:text-white">
                    Liderazgo
                  </span>
                </div>
              </div>
            </div>

            {/* 2. REJILLA TÁCTIL DE 6 TARJETAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 w-full max-w-4xl">
              
              {/* Tarjeta 1: Salvia Táctil */}
              <div className="tactile-card-sage aspect-square p-4 flex flex-col items-center justify-center text-center cursor-pointer group">
                <div className="tactile-inset-badge size-13 bg-gradient-to-b from-white/30 to-black/30 border-white/25">
                  <Sparkles className="size-6 text-white tactile-relief-icon" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-white tracking-tight">
                  Raven
                </span>
                <span className="text-[10px] text-white/80">Matrices</span>
              </div>

              {/* Tarjeta 2: Terracota Wonderlic */}
              <div className="tactile-card-terracotta aspect-square p-4 flex flex-col items-center justify-center text-center cursor-pointer group">
                <div className="tactile-inset-badge size-13 bg-black/55 border-white/15">
                  <Calculator className="size-6 text-[#d9a771] tactile-relief-icon" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-white tracking-tight">
                  Wonderlic
                </span>
                <span className="text-[10px] text-[#e5be8d]">Matemáticas</span>
              </div>

              {/* Tarjeta 3: Coñac con insignia dorada 3D */}
              <div className="tactile-card-terracotta aspect-square p-4 flex flex-col items-center justify-center text-center cursor-pointer group">
                <div className="tactile-inset-badge size-13 bg-gradient-to-br from-[#d9a771]/40 to-black/45 border-[#d9a771]/50">
                  <TrendingUp className="size-6 text-[#f5d09f] tactile-relief-icon" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-white tracking-tight">
                  Aptitud
                </span>
                <span className="text-[10px] text-[#f5d09f]/90">Ajuste Área</span>
              </div>

              {/* Tarjeta 4: Ventana de Enfoque con haz de luz */}
              <div className="tactile-card-dark aspect-square overflow-hidden relative p-4 flex flex-col items-center justify-end text-center cursor-pointer group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0a1c14] via-[#1b3d2b]/85 to-[#d9a771]/35" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-1">
                    <Brain className="size-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    Objetividad
                  </span>
                  <span className="text-[10px] text-[#c7b2a3]">Sin Sesgos</span>
                </div>
              </div>

              {/* Tarjeta 5: Moca Bosque PPG-IPG */}
              <div className="tactile-card-forest aspect-square p-4 flex flex-col items-center justify-center text-center cursor-pointer group">
                <div className="tactile-inset-badge size-13 bg-black/50 border-white/20">
                  <Users className="size-6 text-[#fcfaf5] tactile-relief-icon" />
                </div>
                <span className="mt-2.5 text-xs font-bold text-white tracking-tight">
                  PPG-IPG
                </span>
                <span className="text-[10px] text-[#b8a598]">Personalidad</span>
              </div>

              {/* Tarjeta 6: Arena Dorada con insignia de 3 barras */}
              <div className="tactile-card-honey aspect-square p-4 flex flex-col items-center justify-center text-center cursor-pointer group">
                <div className="tactile-inset-badge size-13 bg-[#7a4821]/45 border-white/30">
                  <div className="flex flex-col gap-1 items-center justify-center tactile-relief-icon">
                    <div className="w-5 h-1 rounded-full bg-[#3d200e]" />
                    <div className="w-4 h-1 rounded-full bg-[#3d200e]" />
                    <div className="w-5 h-1 rounded-full bg-[#3d200e]" />
                  </div>
                </div>
                <span className="mt-2.5 text-xs font-bold text-[#2d1708] tracking-tight">
                  Liderazgo
                </span>
                <span className="text-[10px] text-[#4d2910]">Test 193</span>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            BATERÍAS DE EVALUACIÓN
            ========================================================================= */}
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Baterías de evaluación
            </h2>
            <div className="mx-auto mt-2.5 h-1 w-12 rounded-full bg-[#ba5e30]" />
            <p className="mt-2.5 text-sm sm:text-base text-[#e5d8cc]">
              Pruebas psicométricas y de razonamiento calibradas para cada área de trabajo.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Tarjeta Detalle 1: Raven */}
            <div className="tactile-card-forest p-6 flex flex-col justify-between">
              <div>
                <div className="tactile-inset-badge size-12 mb-4 bg-black/45 text-[#d9a771]">
                  <Target className="size-6" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#d9a771]">
                  Razonamiento Abstracto
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">Matrices de Raven</h3>
                <p className="mt-2.5 text-xs text-[#d4c1b0] leading-relaxed">
                  Evalúa la capacidad de deducción lógica, identificación de patrones visuales y
                  habilidad analítica independiente del idioma o nivel cultural.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#e0cfc2]">
                <span>60 reactivos</span>
                <span className="text-[#d9a771] font-semibold">Baremo General</span>
              </div>
            </div>

            {/* Tarjeta Detalle 2: Wonderlic / Matemáticas */}
            <div className="tactile-card-terracotta p-6 flex flex-col justify-between">
              <div>
                <div className="tactile-inset-badge size-12 mb-4 bg-black/45 text-white">
                  <Calculator className="size-6" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e5be8d]">
                  Agilidad Cognitiva
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">Wonderlic & Matemáticas</h3>
                <p className="mt-2.5 text-xs text-white/90 leading-relaxed">
                  Mide la rapidez en resolución de problemas aritméticos, series lógicas y comprensión
                  cuantitativa bajo límite de tiempo controlado.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white">
                <span>12 minutos</span>
                <span className="text-[#f5d09f] font-semibold">Criterio Rápido</span>
              </div>
            </div>

            {/* Tarjeta Detalle 3: PPG-IPG */}
            <div className="tactile-card-sage p-6 flex flex-col justify-between">
              <div>
                <div className="tactile-inset-badge size-12 mb-4 bg-white/20 text-white">
                  <Layers className="size-6" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white">
                  Comportamiento Laboral
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">Perfil PPG-IPG</h3>
                <p className="mt-2.5 text-xs text-white/90 leading-relaxed">
                  Diagnostica factores de personalidad: ascendencia, responsabilidad, estabilidad emocional,
                  sociabilidad, cautela y relaciones interpersonales.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white">
                <span>8 escalas</span>
                <span className="text-white font-semibold">Perfil de Trabajo</span>
              </div>
            </div>

            {/* Tarjeta Detalle 4: Liderazgo 193 */}
            <div className="tactile-card-honey p-6 flex flex-col justify-between">
              <div>
                <div className="tactile-inset-badge size-12 mb-4 bg-[#633918]/55 text-[#fcfaf5]">
                  <Compass className="size-6" />
                </div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#3d200e]">
                  Juicio y Dirección
                </div>
                <h3 className="mt-1 text-lg font-bold text-[#1f1006]">Cuestionario Liderazgo</h3>
                <p className="mt-2.5 text-xs text-[#3d200e]/90 leading-relaxed">
                  Analiza el estilo de toma de decisiones, resolución de contingencias, delegación
                  y liderazgo situacional frente a escenarios laborales reales.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-[#3d200e]/25 flex items-center justify-between text-[11px] text-[#2d1708]">
                <span>Juicio situacional</span>
                <span className="text-[#572b0c] font-bold">Dirección</span>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            CÓMO FUNCIONA EL PROCESO DE EVALUACIÓN
            ========================================================================= */}
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ¿Cómo funciona?
            </h2>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#ba5e30]" />
            <p className="mt-2.5 text-sm text-[#d4c1b0]">
              Tres pasos simples para completar tu postulación y evaluación.
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

        {/* =========================================================================
            BANNER CTA INFERIOR
            ========================================================================= */}
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-20">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#123826] via-[#0d261b] to-[#431c0a] border border-white/18 p-8 sm:p-12 text-center shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-radial from-[#d9a771]/30 to-transparent blur-2xl"
            />
            
            <h2 className="relative z-10 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ¿Listo para postular?
            </h2>
            <p className="relative z-10 mt-2 text-sm sm:text-base text-[#e5d8cc] max-w-lg mx-auto">
              Revisa las convocatorias abiertas y rinde tus evaluaciones psicométricas en línea.
            </p>

            <div className="relative z-10 mt-8 flex flex-wrap justify-center items-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold shadow-[0_10px_25px_-5px_rgba(186,94,48,0.6)] hover:from-[#ce6d3d] hover:to-[#ba5e30]"
                render={<Link href="/convocatorias" />}
              >
                Ver todas las vacantes
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/12 py-10 bg-[#381406]/90 backdrop-blur-md">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-5xl px-4 sm:px-6 text-xs text-[#d4c1b0]">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-white tracking-tight">Evalua - witmind</span>
            <span>— plataforma de evaluación psicométrica para selección de talento.</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/convocatorias" className="hover:text-white transition-colors">
              Convocatorias
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:text-white transition-colors">
              Ingreso postulantes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
