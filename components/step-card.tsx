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

  // Rutas de ondas orgánicas en sintonía con la nueva paleta de evaluación y precisión
  const wavePaths = [
    // Tarjeta 01: Curva fluida suave
    {
      secondary: "M0,0 L400,0 L400,102 C330,132 260,86 195,116 C130,142 65,96 0,122 Z",
      primary: "M0,0 L400,0 L400,90 C335,120 265,76 195,104 C125,130 60,84 0,108 Z",
      highlight: "M0,108 C60,84 125,130 195,104 C265,76 335,120 400,90",
      accentGrad: { start: "#5c7953", mid: "#ba5e30", end: "#0c2419" },
    },
    // Tarjeta 02: Onda central con acento terracota cálido
    {
      secondary: "M0,0 L400,0 L400,110 C340,82 280,136 205,118 C130,100 70,126 0,98 Z",
      primary: "M0,0 L400,0 L400,98 C340,72 280,124 205,106 C130,88 70,114 0,86 Z",
      highlight: "M0,86 C70,114 130,88 205,106 C280,124 340,72 400,98",
      accentGrad: { start: "#ba5e30", mid: "#d9a771", end: "#0c2419" },
    },
    // Tarjeta 03: Cascada asimétrica en esmeralda profundo
    {
      secondary: "M0,0 L400,0 L400,92 C325,128 250,94 185,126 C115,90 50,122 0,102 Z",
      primary: "M0,0 L400,0 L400,80 C325,116 250,82 185,114 C115,78 50,110 0,90 Z",
      highlight: "M0,90 C50,110 115,78 185,114 C250,82 325,116 400,80",
      accentGrad: { start: "#23543e", mid: "#5c7953", end: "#0c2419" },
    },
  ];

  const wave = wavePaths[index % wavePaths.length];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#10291e] to-[#0a1c14] border border-white/10 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:shadow-[0_28px_56px_-12px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:-translate-y-1.5 transition-all duration-300">
      {/* CABECERA CON ONDAS ESMERALDA Y ACENTOS TÁCTILES */}
      <div className="relative w-full h-32 sm:h-36 overflow-hidden select-none">
        <svg
          viewBox="0 0 400 135"
          fill="none"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#163e2c" />
              <stop offset="60%" stopColor="#102b1f" />
              <stop offset="100%" stopColor="#0a1c14" />
            </linearGradient>

            <linearGradient id={accentGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={wave.accentGrad.start} stopOpacity="0.4" />
              <stop offset="50%" stopColor={wave.accentGrad.mid} stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0c2419" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Capa de onda secundaria translúcida */}
          <path d={wave.secondary} fill={`url(#${accentGradientId})`} />

          {/* 2. Capa principal con verde esmeralda bosque */}
          <path d={wave.primary} fill={`url(#${gradientId})`} />

          {/* 3. Brillo especular sutil en el borde de la onda */}
          <path
            d={wave.highlight}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Contenido en la cabecera: Ícono táctil y número de paso */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          {/* Badge del ícono con hendidura táctil */}
          <div className="tactile-inset-badge size-11 text-[#f5f2ea] group-hover:bg-primary group-hover:border-primary/60 group-hover:text-white transition-all duration-300">
            {icon}
          </div>

          {/* Número de paso en píldora translúcida color arena */}
          <div className="flex items-center px-3 py-1 rounded-full bg-black/25 border border-white/10 backdrop-blur-xs text-[11px] font-mono font-bold tracking-widest text-[#d9a771] group-hover:text-white group-hover:border-white/20 transition-colors">
            {step}
          </div>
        </div>
      </div>

      {/* CUERPO DE LA TARJETA */}
      <div className="flex flex-col flex-1 px-6 pt-3 pb-6">
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground group-hover:text-[#d9a771] transition-colors duration-300">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-balance">
          {body}
        </p>
      </div>
    </div>
  );
}
