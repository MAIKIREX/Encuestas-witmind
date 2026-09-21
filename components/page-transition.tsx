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
const BLUE = "#0b5f9e";

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const centerContentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const resetCurtain = useCallback(() => {
    const blocks = blocksRef.current.filter(Boolean);
    gsap.set(blocks, { xPercent: 100 });
    if (centerContentRef.current) {
      gsap.set(centerContentRef.current, { autoAlpha: 0, scale: 0.96 });
    }
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => resetCurtain(), containerRef);
    return () => ctx.revert();
  }, [resetCurtain]);

  // Fase 3: el telón azul se repliega y muestra la nueva vista.
  const revealDestination = useCallback(() => {
    clearFallback();
    if (!isNavigatingRef.current) return;

    if (prefersReducedMotion()) {
      setIsTransitioning(false);
      isNavigatingRef.current = false;
      return;
    }

    timelineRef.current?.kill();
    const blocks = blocksRef.current.filter(Boolean);
    const center = centerContentRef.current;

    timelineRef.current = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        resetCurtain();
        setIsTransitioning(false);
        isNavigatingRef.current = false;
      },
    });

    if (center) {
      timelineRef.current.to(center, { autoAlpha: 0, scale: 0.96, duration: 0.16 }, 0);
    }
    timelineRef.current.to(
      blocks,
      { xPercent: -100, duration: 0.46, stagger: 0.055 },
      0.04
    );
  }, [clearFallback, resetCurtain]);

  // Fase 1: cerrar la vista con el telón. Fase 2: mantener la pantalla completamente azul.
  const transitionTo = useCallback(
    (href: string) => {
      if (isNavigatingRef.current) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }

      isNavigatingRef.current = true;
      setIsTransitioning(true);
      clearFallback();
      timelineRef.current?.kill();
      resetCurtain();

      const blocks = blocksRef.current.filter(Boolean);
      const center = centerContentRef.current;
      const timeline = gsap.timeline({ defaults: { ease: "power3.inOut" } });
      timelineRef.current = timeline;

      timeline
        .addLabel("close", 0)
        .to(blocks, { xPercent: 0, duration: 0.46, stagger: 0.055 }, "close")
        .addLabel("blue", ">")
        .to({}, { duration: 0.32 }, "blue");

      if (center) {
        timeline.to(center, { autoAlpha: 1, scale: 1, duration: 0.2, ease: "power2.out" }, "blue");
      }

      timeline.add(() => {
        router.push(href);
        // Si la nueva ruta no responde, evitamos que la interfaz quede bloqueada indefinidamente.
        fallbackTimerRef.current = setTimeout(revealDestination, 2500);
      });
    },
    [clearFallback, resetCurtain, revealDestination, router]
  );

  // usePathname es el equivalente a los eventos de navegación en App Router.
  useEffect(() => {
    if (!isNavigatingRef.current) return;
    const frame = requestAnimationFrame(revealDestination);
    return () => cancelAnimationFrame(frame);
  }, [pathname, revealDestination]);

  useEffect(() => {
    return () => {
      clearFallback();
      timelineRef.current?.kill();
    };
  }, [clearFallback]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || /^(mailto:|tel:|javascript:)/.test(rawHref)) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (
          url.origin !== window.location.origin ||
          (url.pathname === window.location.pathname && url.search === window.location.search)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        transitionTo(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        // Si la URL no se puede interpretar, el navegador conserva su navegación nativa.
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => document.removeEventListener("click", handleDocumentClick, { capture: true });
  }, [transitionTo]);

  return (
    <PageTransitionContext.Provider value={{ transitionTo }}>
      {children}

      <div
        ref={containerRef}
        aria-hidden="true"
        className={`fixed inset-0 z-[99999] overflow-hidden select-none ${
          isTransitioning ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: NUM_BLOCKS }).map((_, index) => (
            <div
              key={index}
              ref={(element) => {
                blocksRef.current[index] = element;
              }}
              className="relative flex-1 border-b border-white/10 last:border-b-0"
              style={{ backgroundColor: BLUE, transform: "translateX(100%)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-[#063e69]/20" />
            </div>
          ))}
        </div>

        <div
          ref={centerContentRef}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white text-[#0b5f9e] shadow-md">
              <ClipboardCheck className="size-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">evalua</span>
          </div>
          <div className="mt-3 h-0.5 w-24 overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-full animate-[pulse_1s_ease-in-out_infinite] bg-white" />
          </div>
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
