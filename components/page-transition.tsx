"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ClipboardCheck } from "lucide-react";

interface PageTransitionContextType {
  transitionTo: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | null>(null);

export function usePageTransition() {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider");
  }
  return ctx;
}

const NUM_BLOCKS = 5;

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement>(null);
  const accentBlocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const mainBlocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const centerContentRef = useRef<HTMLDivElement>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const isNavigatingRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper para verificar preferencia de movimiento reducido
  const prefersReducedMotion = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  // Inicializar posiciones de los bloques fuera de la pantalla a la derecha
  useEffect(() => {
    const accentBars = accentBlocksRef.current.filter(Boolean);
    const mainBars = mainBlocksRef.current.filter(Boolean);

    gsap.set(accentBars, { xPercent: 100 });
    gsap.set(mainBars, { xPercent: 100 });
    if (centerContentRef.current) {
      gsap.set(centerContentRef.current, { opacity: 0, scale: 0.9 });
    }
  }, []);

  // Animación de salida (revelar nueva página hacia la izquierda)
  const animateCurtainOut = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (prefersReducedMotion()) {
      setIsTransitioning(false);
      isNavigatingRef.current = false;
      return;
    }

    const accentBars = accentBlocksRef.current.filter(Boolean);
    const mainBars = mainBlocksRef.current.filter(Boolean);
    const centerEl = centerContentRef.current;

    const tl = gsap.timeline({
      onComplete: () => {
        // Regresar las barras a la derecha para la próxima transición
        gsap.set(accentBars, { xPercent: 100 });
        gsap.set(mainBars, { xPercent: 100 });
        if (centerEl) {
          gsap.set(centerEl, { opacity: 0, scale: 0.9 });
        }
        setIsTransitioning(false);
        isNavigatingRef.current = false;
        pendingHrefRef.current = null;
      },
    });

    if (centerEl) {
      tl.to(
        centerEl,
        {
          opacity: 0,
          scale: 0.9,
          duration: 0.18,
          ease: "power2.in",
        },
        0
      );
    }

    // El telón principal continúa moviéndose de 0% a -100% (hacia la izquierda)
    tl.to(
      mainBars,
      {
        xPercent: -100,
        duration: 0.42,
        ease: "power3.inOut",
        stagger: 0.04,
      },
      0.05
    );

    // Las barras de acento también se deslizan hacia la izquierda
    tl.to(
      accentBars,
      {
        xPercent: -100,
        duration: 0.38,
        ease: "power3.inOut",
        stagger: 0.04,
      },
      0.08
    );
  }, []);

  // Animación de entrada (cubrir pantalla de derecha a izquierda)
  const transitionTo = useCallback(
    (href: string) => {
      if (isNavigatingRef.current) return;

      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }

      isNavigatingRef.current = true;
      setIsTransitioning(true);
      pendingHrefRef.current = href;

      const accentBars = accentBlocksRef.current.filter(Boolean);
      const mainBars = mainBlocksRef.current.filter(Boolean);
      const centerEl = centerContentRef.current;

      // Asegurar que comiencen en la derecha
      gsap.set(accentBars, { xPercent: 100 });
      gsap.set(mainBars, { xPercent: 100 });
      if (centerEl) {
        gsap.set(centerEl, { opacity: 0, scale: 0.9 });
      }

      const tl = gsap.timeline({
        onComplete: () => {
          // Navegar cuando el telón cubra completamente la pantalla
          router.push(href);

          // Timer de seguridad: si por alguna razón la ruta no dispara el efecto, abrir el telón tras 1.2s
          fallbackTimerRef.current = setTimeout(() => {
            animateCurtainOut();
          }, 1200);
        },
      });

      // 1. Capa de acento naranja entra primero de derecha a izquierda (stagger arriba -> abajo)
      tl.to(
        accentBars,
        {
          xPercent: 0,
          duration: 0.38,
          ease: "power3.inOut",
          stagger: 0.04,
        },
        0
      );

      // 2. Capa principal oscura entra justo después cubriendo la pantalla
      tl.to(
        mainBars,
        {
          xPercent: 0,
          duration: 0.42,
          ease: "power3.inOut",
          stagger: 0.04,
        },
        0.06
      );

      // 3. Logo/nombre brevemente visible en el centro
      if (centerEl) {
        tl.to(
          centerEl,
          {
            opacity: 1,
            scale: 1,
            duration: 0.22,
            ease: "power2.out",
          },
          0.26
        );
      }
    },
    [router, animateCurtainOut]
  );

  // Detectar cuando el pathname cambia para abrir el telón (curtain out)
  useEffect(() => {
    if (isNavigatingRef.current) {
      // Dejar un frame para que React monte la nueva vista antes de levantar el telón
      const raf = requestAnimationFrame(() => {
        animateCurtainOut();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname, animateCurtainOut]);

  // Limpiar timer de fallback al desmontar
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  // Interceptar clics en enlaces globales en fase de captura
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignorar clics con botón no principal (ej. botón derecho o central)
      if (e.button !== 0) return;

      // Ignorar combinaciones de teclas (abrir en nueva pestaña/ventana)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      // Verificar target _blank, download o rel external
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // Ignorar anclas internas simples (#algo) o enlaces no http
      if (
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);

        // Ignorar dominios externos
        if (url.origin !== window.location.origin) return;

        // Si es la misma página exacta (mismo path, mismo search, y sólo cambia o no el hash)
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }

        // Interceptar navegación y ejecutar transición personalizada
        e.preventDefault();
        e.stopPropagation();
        transitionTo(anchor.href);
      } catch {
        // En caso de fallo de parsing URL, permitir navegación normal
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, [transitionTo]);

  return (
    <PageTransitionContext.Provider value={{ transitionTo }}>
      {children}

      {/* Contenedor del telón por bloques horizontales */}
      <div
        ref={containerRef}
        aria-hidden="true"
        className={`fixed inset-0 z-[99999] overflow-hidden select-none ${
          isTransitioning ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Capa 1: Bloques de acento naranja (#f26522 / primary) */}
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          {Array.from({ length: NUM_BLOCKS }).map((_, index) => (
            <div
              key={`accent-${index}`}
              ref={(el) => {
                accentBlocksRef.current[index] = el;
              }}
              className="w-full flex-1 bg-gradient-to-r from-primary to-[#ff8a47] shadow-lg"
              style={{ transform: "translateX(100%)" }}
            />
          ))}
        </div>

        {/* Capa 2: Bloques principales del telón oscuro (#071824 / slate navy) */}
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          {Array.from({ length: NUM_BLOCKS }).map((_, index) => (
            <div
              key={`main-${index}`}
              ref={(el) => {
                mainBlocksRef.current[index] = el;
              }}
              className="relative w-full flex-1 bg-[#071824] border-b border-white/[0.04] last:border-b-0 shadow-2xl flex items-center justify-end overflow-hidden"
              style={{ transform: "translateX(100%)" }}
            >
              {/* Sutil brillo horizontal interno en cada barra */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-primary/5 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Marca/Indicador central elegante durante el cambio de pantalla */}
        <div
          ref={centerContentRef}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-white"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-md">
              <ClipboardCheck className="size-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              evalua
            </span>
          </div>
          {/* Pequeña barra indicadora de carga activa */}
          <div className="mt-3 h-0.5 w-24 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-full bg-primary animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
