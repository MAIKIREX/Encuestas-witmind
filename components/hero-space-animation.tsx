"use client";

import { useId } from "react";

export type SpaceAnimationMode = "constellation" | "orbits" | "aurora" | "sonar";

interface HeroSpaceAnimationProps {
  mode?: SpaceAnimationMode;
}

export function HeroSpaceAnimation({ mode = "constellation" }: HeroSpaceAnimationProps) {
  const gradientId = useId();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Resplandor difuso de nebulosa (siempre activo de fondo, muy suave) */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-radial from-sky-500/10 via-[#2f86c9]/5 to-transparent blur-3xl animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-6 right-8 w-60 h-60 rounded-full bg-radial from-primary/10 to-transparent blur-2xl animate-pulse"
        style={{ animationDuration: "11s", animationDelay: "2s" }}
      />

      {/* 2. Anillos orbitales elípticos ultrafinos (rotación suave continua) */}
      {(mode === "constellation" || mode === "orbits") && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] sm:w-[36rem] h-[30rem] sm:h-[36rem] opacity-25">
            <svg viewBox="0 0 400 400" className="w-full h-full animate-[spin_70s_linear_infinite]">
              <ellipse
                cx="200"
                cy="200"
                rx="180"
                ry="70"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
                strokeDasharray="4 6"
                className="text-sky-300/40"
                transform="rotate(-20 200 200)"
              />
              <circle cx="370" cy="180" r="2" fill="#f26522" className="animate-ping" style={{ animationDuration: "4s" }} />
              <circle cx="370" cy="180" r="1.75" fill="#f26522" />
            </svg>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] sm:w-[28rem] h-[22rem] sm:h-[28rem] opacity-20">
            <svg viewBox="0 0 300 300" className="w-full h-full animate-[spin_55s_linear_infinite_reverse]">
              <ellipse
                cx="150"
                cy="150"
                rx="130"
                ry="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
                className="text-sky-200/50"
                transform="rotate(30 150 150)"
              />
              <circle cx="270" cy="165" r="1.5" fill="#ffffff" />
            </svg>
          </div>
        </>
      )}

      {/* 3. Red de constelación geométrica sutil (líneas y estrellas conectadas) */}
      {(mode === "constellation") && (
        <svg className="absolute inset-0 w-full h-full opacity-35">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2f86c9" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f26522" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Líneas tenues de constelación */}
          <g stroke={`url(#${gradientId})`} strokeWidth="0.5" strokeDasharray="3 4" opacity="0.4">
            <line x1="28%" y1="32%" x2="48%" y2="24%" />
            <line x1="48%" y1="24%" x2="68%" y2="38%" />
            <line x1="68%" y1="38%" x2="82%" y2="28%" />
            <line x1="48%" y1="24%" x2="58%" y2="58%" />
            <line x1="58%" y1="58%" x2="78%" y2="68%" />
            <line x1="34%" y1="72%" x2="58%" y2="58%" />
            <line x1="78%" y1="68%" x2="88%" y2="52%" />
          </g>

          {/* Nodos de estrellas con titileo suave */}
          <g>
            <circle cx="28%" cy="32%" r="2" fill="#ffffff" className="animate-pulse" style={{ animationDuration: "3.2s" }} />
            <circle cx="48%" cy="24%" r="2.5" fill="#2f86c9" className="animate-pulse" style={{ animationDuration: "4.5s" }} />
            <circle cx="68%" cy="38%" r="2" fill="#ffffff" className="animate-pulse" style={{ animationDuration: "3.8s" }} />
            <circle cx="82%" cy="28%" r="1.75" fill="#ffc466" className="animate-pulse" style={{ animationDuration: "5.2s" }} />
            <circle cx="58%" cy="58%" r="3" fill="#f26522" className="animate-pulse" style={{ animationDuration: "4s" }} />
            <circle cx="78%" cy="68%" r="2" fill="#ffffff" className="animate-pulse" style={{ animationDuration: "3.5s" }} />
            <circle cx="34%" cy="72%" r="2" fill="#2f86c9" className="animate-pulse" style={{ animationDuration: "4.8s" }} />
            <circle cx="88%" cy="52%" r="2" fill="#ffffff" className="animate-pulse" style={{ animationDuration: "2.9s" }} />
          </g>
        </svg>
      )}

      {/* 4. Ondas concéntricas de pulso / radar cósmico */}
      {(mode === "sonar") && (
        <div className="absolute top-1/2 right-1/3 -translate-y-1/2 flex items-center justify-center">
          <div className="size-20 rounded-full border border-sky-300/20 animate-ping" style={{ animationDuration: "5s" }} />
          <div className="size-40 rounded-full border border-sky-300/15 animate-ping absolute" style={{ animationDuration: "6s", animationDelay: "1.5s" }} />
          <div className="size-64 rounded-full border border-sky-300/10 animate-ping absolute" style={{ animationDuration: "7s", animationDelay: "3s" }} />
          <div className="size-2 rounded-full bg-primary" />
        </div>
      )}

      {/* 5. Micro-partículas de polvo estelar parpadeantes */}
      <div className="absolute top-1/4 left-1/3 size-1 rounded-full bg-white/70 animate-ping" style={{ animationDuration: "6s" }} />
      <div className="absolute top-2/3 left-1/4 size-1 rounded-full bg-sky-200/60 animate-ping" style={{ animationDuration: "7.5s", animationDelay: "2s" }} />
      <div className="absolute top-1/3 right-1/4 size-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDuration: "5s" }} />
      <div className="absolute top-3/4 right-1/3 size-1 rounded-full bg-white/70 animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }} />
      <div className="absolute bottom-1/5 right-1/5 size-0.5 rounded-full bg-sky-100/80" />
      <div className="absolute top-1/5 right-1/2 size-0.5 rounded-full bg-white/60" />
    </div>
  );
}
