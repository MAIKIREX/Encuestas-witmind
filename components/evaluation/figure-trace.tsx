"use client";

import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TracePoint } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// Respuesta canonica: el par ordenado de menor a mayor ("6,9"), de modo que
// trazar 6→9 o 9→6 se puntua igual contra la clave del servidor.
export function canonicalPair(a: number, b: number) {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

const LABEL_OFFSET = 13;

// Cada numero se ubica hacia afuera del poligono, siguiendo la normal del
// vertice, para que nunca quede encima de un trazo (tambien en entrantes).
function labelPositions(points: TracePoint[]) {
  const count = points.length;
  let area = 0;
  for (let i = 0; i < count; i++) {
    const p = points[i];
    const q = points[(i + 1) % count];
    area += p.x * q.y - q.x * p.y;
  }
  const side = area > 0 ? 1 : -1;

  const edgeNormal = (from: TracePoint, to: TracePoint) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: (side * dy) / length, y: (-side * dx) / length };
  };

  return points.map((point, i) => {
    const prev = edgeNormal(points[(i - 1 + count) % count], point);
    const next = edgeNormal(point, points[(i + 1) % count]);
    let nx = prev.x + next.x;
    let ny = prev.y + next.y;
    const length = Math.hypot(nx, ny);
    if (length < 0.2) {
      nx = next.x;
      ny = next.y;
    } else {
      nx /= length;
      ny /= length;
    }
    return { x: point.x + nx * LABEL_OFFSET, y: point.y + ny * LABEL_OFFSET };
  });
}

export function FigureTrace({
  viewBox,
  points,
  onChange,
}: {
  viewBox: [number, number, number, number];
  points: TracePoint[];
  onChange: (valueText: string | null) => void;
}) {
  const [selection, setSelection] = useState<number[]>([]);
  const labels = useMemo(() => labelPositions(points), [points]);
  const byNumber = useMemo(() => new Map(points.map((p) => [p.n, p])), [points]);

  function update(next: number[]) {
    setSelection(next);
    onChange(next.length === 2 ? canonicalPair(next[0], next[1]) : null);
  }

  function toggle(n: number) {
    if (selection.includes(n)) update(selection.filter((s) => s !== n));
    else if (selection.length === 2) update([n]);
    else update([...selection, n]);
  }

  const start = selection[0] !== undefined ? byNumber.get(selection[0]) : undefined;
  const end = selection[1] !== undefined ? byNumber.get(selection[1]) : undefined;
  const [low, high] = selection.length === 2 ? [Math.min(...selection), Math.max(...selection)] : [];

  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
      <svg
        viewBox={viewBox.join(" ")}
        role="group"
        aria-label="Figura geométrica con puntos numerados"
        className="mx-auto block h-auto w-full max-w-lg touch-manipulation select-none"
      >
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          strokeWidth={1.6}
          strokeLinejoin="round"
          className="fill-secondary/60 stroke-foreground/80"
        />

        {start && end && (
          <line
            key={`${start.n}-${end.n}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            pathLength={1}
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-primary motion-safe:animate-draw-line"
            style={{ strokeDasharray: 1 }}
          />
        )}

        {points.map((point, i) => {
          const active = selection.includes(point.n);
          return (
            <g
              key={point.n}
              role="button"
              tabIndex={0}
              aria-label={`Punto ${point.n}`}
              aria-pressed={active}
              onClick={() => toggle(point.n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(point.n);
                }
              }}
              className="group cursor-pointer outline-none"
            >
              <circle cx={point.x} cy={point.y} r={10} className="fill-transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={9}
                strokeWidth={1.5}
                className={cn(
                  "fill-none transition-colors",
                  active ? "stroke-primary/50" : "stroke-transparent group-hover:stroke-primary/40",
                  "group-focus-visible:stroke-ring",
                )}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 5.5 : 4.5}
                className={cn(
                  "transition-all",
                  active ? "fill-primary" : "fill-foreground group-hover:fill-primary/80",
                )}
              />
              <text
                x={labels[i].x}
                y={labels[i].y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  "pointer-events-none text-[9.5px] font-semibold tabular-nums transition-colors",
                  active ? "fill-primary" : "fill-foreground",
                )}
              >
                {point.n}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {selection.length === 0 && "Toca un punto para empezar la línea."}
          {selection.length === 1 && (
            <>
              Punto de partida: <strong className="text-foreground">{selection[0]}</strong>. Ahora toca el punto final.
            </>
          )}
          {selection.length === 2 && (
            <>
              Línea trazada entre el punto <strong className="text-foreground">{low}</strong> y el punto{" "}
              <strong className="text-foreground">{high}</strong>.
            </>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" disabled={selection.length === 0} onClick={() => update([])}>
          <Eraser data-icon="inline-start" />
          Borrar trazo
        </Button>
      </div>
    </div>
  );
}
