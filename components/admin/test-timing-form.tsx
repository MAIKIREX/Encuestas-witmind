"use client";

import { useState, useTransition } from "react";
import { Clock3, TimerOff } from "lucide-react";
import { sileo } from "sileo";

import { updateTestTiming } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TestTimingFormProps = {
  testId: string;
  isTimed: boolean;
  initialTimeLimitSeconds: number | null;
};

export function TestTimingForm({
  testId,
  isTimed,
  initialTimeLimitSeconds,
}: TestTimingFormProps) {
  const [enabled, setEnabled] = useState(isTimed);
  const [minutes, setMinutes] = useState(
    initialTimeLimitSeconds ? String(Math.max(1, Math.round(initialTimeLimitSeconds / 60))) : "30",
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsedMinutes = Number(minutes);
    if (enabled && (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 240)) {
      sileo.error({
        title: "Tiempo no válido",
        description: "Ingresa un número entero entre 1 y 240 minutos.",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateTestTiming(testId, {
        isTimed: enabled,
        timeLimitMinutes: enabled ? parsedMinutes : null,
      });

      if ("error" in result) {
        sileo.error({ title: "No se pudo guardar", description: result.error });
        return;
      }

      sileo.success({
        title: "Configuración guardada",
        description: enabled
          ? `El postulante tendrá ${parsedMinutes} minutos para completar la prueba.`
          : "La prueba quedó sin límite de tiempo.",
      });
    });
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-white/15 bg-[#113023] p-5 shadow-[0_20px_50px_rgba(5,18,12,0.2)] sm:p-6">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#d9a771]/15 text-[#f4c990]">
          {enabled ? <Clock3 className="size-5" /> : <TimerOff className="size-5" />}
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">Configuración de tiempo</h2>
          <p className="mt-1 text-sm leading-6 text-white/65">
            Define si esta prueba debe completarse dentro de un tiempo total.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors hover:border-white/20">
          <input
            checked={enabled}
            className="mt-0.5 size-4 accent-[#d9a771]"
            disabled={isPending}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-white">Usar límite de tiempo</span>
            <span className="mt-1 block text-xs leading-5 text-white/60">
              Al vencer el plazo, se finalizará la prueba del postulante.
            </span>
          </span>
        </label>

        {enabled ? (
          <div className="space-y-2">
            <Label className="text-white/85" htmlFor="time-limit-minutes">
              Minutos totales
            </Label>
            <Input
              id="time-limit-minutes"
              inputMode="numeric"
              max={240}
              min={1}
              onChange={(event) => setMinutes(event.target.value)}
              type="number"
              value={minutes}
            />
          </div>
        ) : (
          <p className="pb-3 text-sm text-white/60">Sin límite de tiempo.</p>
        )}
      </div>

      <div className="mt-5 flex justify-end border-t border-white/10 pt-5">
        <Button disabled={isPending} onClick={handleSave} type="button">
          {isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </section>
  );
}
