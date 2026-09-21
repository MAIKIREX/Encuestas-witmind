"use client";

import { useState } from "react";

const TILE_COUNT = 160;

// No impide capturas de pantalla -eso no es posible desde un navegador- pero
// identifica a quien tomo una si se filtra: es la defensa real disponible.
export function WatermarkOverlay({ identity }: { identity: string }) {
  const [stamp] = useState(() => new Date().toLocaleString("es-PE"));
  const text = `${identity} · ${stamp}`;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      <div
        className="flex flex-wrap content-start gap-x-10 gap-y-14 opacity-[0.07] dark:opacity-[0.12]"
        style={{ position: "absolute", inset: "-25%", transform: "rotate(-24deg)" }}
      >
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <span key={i} className="text-xs font-medium whitespace-nowrap text-foreground">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
