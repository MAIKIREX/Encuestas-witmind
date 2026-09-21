"use client";

import { useId, type ReactNode } from "react";

interface StepCardProps {
  icon: ReactNode;
  step: string;
  title: string;
  body: string;
  index: number;
}

export function StepCard({ icon, step, title, body, index }: StepCardProps) {
  const gradientId = useId();
  const accentGradientId = useId();

  // Rutas de ondas únicas para cada tarjeta ("como chocolate líquido derramado/ondulado")
  const wavePaths = [
    // Tarjeta 01: Onda con caída fluida a la izquierda y elevación suave al centro
    {
      secondary: "M0,0 L400,0 L400,102 C330,132 260,86 195,116 C130,142 65,96 0,122 Z",
      primary: "M0,0 L400,0 L400,90 C335,120 265,76 195,104 C125,130 60,84 0,108 Z",
      highlight: "M0,108 C60,84 125,130 195,104 C265,76 335,120 400,90",
      stars: [
        { top: "24%", left: "38%", size: "w-1 h-1", color: "bg-white/70", delay: "0s" },
        { top: "34%", left: "62%", size: "w-1.5 h-1.5", color: "bg-sky-300/50", delay: "1.2s" },
        { top: "20%", left: "78%", size: "w-1 h-1", color: "bg-primary/70", delay: "2.5s" },
      ],
    },
    // Tarjeta 02: Onda con gota central pronunciada y ritmo ondulante estilo chocolate
    {
      secondary: "M0,0 L400,0 L400,110 C340,82 280,136 205,118 C130,100 70,126 0,98 Z",
      primary: "M0,0 L400,0 L400,98 C340,72 280,124 205,106 C130,88 70,114 0,86 Z",
      highlight: "M0,86 C70,114 130,88 205,106 C280,124 340,72 400,98",
      stars: [
        { top: "28%", left: "42%", size: "w-1 h-1", color: "bg-sky-200/60", delay: "0.8s" },
        { top: "18%", left: "68%", size: "w-1 h-1", color: "bg-white/80", delay: "1.8s" },
        { top: "36%", left: "82%", size: "w-1.5 h-1.5", color: "bg-primary/60", delay: "2.1s" },
      ],
    },
    // Tarjeta 03: Cascada asimétrica orgánica que fluye de derecha a izquierda
    {
      secondary: "M0,0 L400,0 L400,92 C325,128 250,94 185,126 C115,90 50,122 0,102 Z",
      primary: "M0,0 L400,0 L400,80 C325,116 250,82 185,114 C115,78 50,110 0,90 Z",
      highlight: "M0,90 C50,110 115,78 185,114 C250,82 325,116 400,80",
      stars: [
        { top: "20%", left: "45%", size: "w-1 h-1", color: "bg-white/70", delay: "0.4s" },
        { top: "32%", left: "70%", size: "w-1.5 h-1.5", color: "bg-sky-300/60", delay: "1.5s" },
        { top: "22%", left: "85%", size: "w-1 h-1", color: "bg-primary/80", delay: "3s" },
      ],
    },
  ];

  const wave = wavePaths[index % wavePaths.length];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border border-border/70 shadow-[0_12px_32px_-8px_rgba(11,43,64,0.07)] hover:shadow-[0_22px_48px_-12px_rgba(11,43,64,0.18)] hover:-translate-y-1.5 transition-all duration-300">
      {/* CABECERA CON ONDAS AZULES TIPO CHOCOLATE Y RELLENO AZUL COMO EL HERO */}
      <div className="relative w-full h-32 sm:h-36 overflow-hidden select-none">
        {/* SVG de ondas líquidas rellenas en azul profundo con brillo superior */}
        <svg
          viewBox="0 0 400 135"
          fill="none"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        >
          <defs>
            {/* Gradiente azul del hero: #0b2b40 -> #0d344d -> #082030 */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b2b40" />
              <stop offset="55%" stopColor="#0d344d" />
              <stop offset="100%" stopColor="#082030" />
            </linearGradient>

            {/* Gradiente de la segunda onda azul traslúcida (capa de profundidad) */}
            <linearGradient id={accentGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2f86c9" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#4fa8e0" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1a4d6f" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* 1. Capa de onda secundaria azul translúcida para dar volumen fluido */}
          <path d={wave.secondary} fill={`url(#${accentGradientId})`} />

          {/* 2. Capa principal con relleno azul profundo idéntico al hero */}
          <path d={wave.primary} fill={`url(#${gradientId})`} />

          {/* 3. Brillo especular en el borde de la onda (acabado lustroso como chocolate líquido) */}
          <path
            d={wave.highlight}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Micro-estrellas y partículas cósmicas (eco directo de la animación del hero) */}
        {wave.stars.map((star, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-full ${star.size} ${star.color} animate-pulse`}
            style={{
              top: star.top,
              left: star.left,
              animationDuration: "3.5s",
              animationDelay: star.delay,
            }}
          />
        ))}

        {/* Contenido en la cabecera: Ícono y número de paso */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          {/* Badge del ícono con soporte interactivo */}
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12 text-white border border-white/20 backdrop-blur-xs shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground group-hover:scale-105 group-hover:shadow-[0_8px_20px_-4px_rgba(242,101,34,0.45)] transition-all duration-300">
            {icon}
          </div>

          {/* Número de paso en píldora translúcida */}
          <div className="flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xs text-[11px] font-mono font-bold tracking-widest text-sky-200/90 group-hover:text-white group-hover:border-white/30 transition-colors">
            {step}
          </div>
        </div>
      </div>

      {/* CUERPO DE LA TARJETA (FONDO LIMPIO CON TIPOGRAFÍA DE ALTO CONTRASTE) */}
      <div className="flex flex-col flex-1 px-6 pt-3 pb-6">
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-balance">
          {body}
        </p>
      </div>
    </div>
  );
}
