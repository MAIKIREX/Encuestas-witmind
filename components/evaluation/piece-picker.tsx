"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type { PiecePoint } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Piece = { n: number; points: PiecePoint[] };

// Respuesta canonica: numeros ordenados ("2,3,4,5").
function canonicalSet(numbers: number[]) {
  return [...numbers].sort((a, b) => a - b).join(",");
}

export function PiecePicker({
  pieces,
  cell,
  pick,
  onChange,
}: {
  pieces: Piece[];
  cell: [number, number];
  pick: number;
  onChange: (valueText: string | null) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const full = selected.length >= pick;

  function toggle(n: number) {
    const next = selected.includes(n)
      ? selected.filter((s) => s !== n)
      : full
        ? selected
        : [...selected, n];
    if (next === selected) return;
    setSelected(next);
    onChange(next.length === pick ? canonicalSet(next) : null);
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
      <div role="group" aria-label="Piezas disponibles" className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {pieces.map((piece) => {
          const active = selected.includes(piece.n);
          const blocked = full && !active;
          return (
            <button
              key={piece.n}
              type="button"
              aria-pressed={active}
              aria-label={`Pieza ${piece.n}`}
              aria-disabled={blocked}
              onClick={() => toggle(piece.n)}
              className={cn(
                "relative grid min-h-24 place-items-center rounded-xl border px-2 pb-2 pt-6 shadow-xs outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : blocked
                    ? "cursor-not-allowed border-border/50 bg-card/60 opacity-60"
                    : "border-border/70 bg-card hover:bg-secondary/60",
              )}
            >
              <span
                className={cn(
                  "absolute left-2 top-2 grid size-5 place-items-center rounded-full text-[11px] font-bold tabular-nums",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80",
                )}
              >
                {active ? <Check className="size-3" strokeWidth={3} /> : piece.n}
              </span>
              <svg viewBox={`0 0 ${cell[0]} ${cell[1]}`} className="block h-auto w-full" aria-hidden="true">
                <polygon
                  points={piece.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  className={cn(
                    "stroke-foreground/80 transition-colors",
                    active ? "fill-primary/25" : "fill-secondary/70",
                  )}
                />
              </svg>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
        Piezas elegidas: <strong className="text-foreground tabular-nums">{selected.length}</strong> de {pick}.
        {full && " Desmarca una si quieres cambiar tu elección."}
      </p>
    </div>
  );
}
