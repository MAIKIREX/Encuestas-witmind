"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, Timer } from "lucide-react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { WatermarkOverlay } from "@/components/watermark-overlay";
import { clockFromSeconds } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AttemptItem, AttemptState, LikertLabel, ProctorEvent } from "@/lib/supabase/types";

type Answer = {
  optionId: string | null;
  value: number | null;
  valueText: string | null;
  leastOptionId: string | null;
};
type QueueItem = {
  itemId: string;
  optionId: string | null;
  value: number | null;
  valueText: string | null;
  leastOptionId: string | null;
  elapsedMs: number;
};

const HEARTBEAT_MS = 30_000;
const STRIKE_THRESHOLD = 3;

function initialAnswers(state: AttemptState) {
  const map = new Map<string, Answer>();
  for (const [itemId, r] of Object.entries(state.responses ?? {})) {
    map.set(itemId, {
      optionId: r.option_id,
      value: r.value,
      valueText: r.value_text,
      leastOptionId: r.least_option_id,
    });
  }
  return map;
}

function isAnswerable(answer: Answer | null, item: AttemptItem | undefined) {
  if (!answer) return false;
  if (item?.type === "forced_choice") {
    // Pares de 2 frases (p.ej. Test Perfil y Estilos de Liderazgo): se marca
    // solo la que MAS se parece, sin "least" (a diferencia de las tétradas
    // de PPG-IPG, que sí requieren ambas marcas).
    if (item.options.length === 2) return answer.optionId !== null;
    return (
      answer.optionId !== null &&
      answer.leastOptionId !== null &&
      answer.optionId !== answer.leastOptionId
    );
  }
  if (answer.valueText !== null) return answer.valueText.trim().length > 0;
  return answer.optionId !== null || answer.value !== null;
}

export function Runner({
  state,
  likertLabels,
  applicationId,
  identity,
}: {
  state: AttemptState;
  likertLabels: LikertLabel[];
  applicationId: string;
  identity: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const attemptId = state.attempt_id;
  const items = state.items;
  const queueKey = `attempt:${attemptId}:queue`;

  const [answers, setAnswers] = useState<Map<string, Answer>>(() => initialAnswers(state));
  const [index, setIndex] = useState(() => {
    const answered = initialAnswers(state);
    const first = items.findIndex((i) => !answered.has(i.id));
    return first === -1 ? Math.max(0, items.length - 1) : first;
  });
  const [selected, setSelected] = useState<Answer | null>(
    () => initialAnswers(state).get(items[0]?.id) ?? null,
  );
  const [freeText, setFreeText] = useState(() => initialAnswers(state).get(items[0]?.id)?.valueText ?? "");
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string | null>(null);
  const disqualifiedRef = useRef(false);

  // El deadline se ancla al reloj del servidor: guardamos la diferencia con el
  // reloj local y derivamos de ahi todo el countdown. El servidor valida igual.
  const [deadlineMs, setDeadlineMs] = useState<number | null>(() => {
    if (!state.deadline_at) return null;
    const skew = Date.now() - new Date(state.server_now).getTime();
    return new Date(state.deadline_at).getTime() + skew;
  });
  const [remaining, setRemaining] = useState<number | null>(state.seconds_remaining);

  // Se fija en el primer efecto: leer el reloj durante el render es impuro.
  const itemShownAt = useRef(0);

  const current = items[index];
  const isLast = index === items.length - 1;
  const doneCount = answers.size;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const logEvent = useCallback(
    (eventType: ProctorEvent, severity: "info" | "warn" | "critical") => {
      if (disqualifiedRef.current) return;
      void supabase
        .rpc("report_proctoring_event", {
          p_attempt_id: attemptId,
          p_event_type: eventType,
          p_severity: severity,
        })
        .then(({ data, error }) => {
          if (error || !data) return;
          const result = data as {
            strikes: number;
            threshold: number;
            is_strike: boolean;
            disqualified: boolean;
          };
          if (!result.is_strike) return;

          setStrikes(result.strikes);

          if (result.disqualified) {
            disqualifiedRef.current = true;
            setDisqualifiedReason(
              "Se detectaron demasiados cambios de pestaña o salidas de pantalla completa durante esta prueba.",
            );
            return;
          }

          const remaining = result.threshold - result.strikes;
          sileo.warning({
            title: `Advertencia de integridad ${result.strikes}/${result.threshold}`,
            description:
              remaining <= 1
                ? "Una incidencia más y esta prueba se cancelará automáticamente."
                : "Evita cambiar de pestaña o salir de pantalla completa: puede cancelar tu prueba.",
            duration: 6000,
          });
        });
    },
    [supabase, attemptId],
  );

  const flushQueue = useCallback(async () => {
    const raw = localStorage.getItem(queueKey);
    if (!raw) return;

    let queue: QueueItem[];
    try {
      queue = JSON.parse(raw);
    } catch {
      localStorage.removeItem(queueKey);
      return;
    }

    const stillPending: QueueItem[] = [];
    for (const q of queue) {
      const { error } = await supabase.rpc("save_response", {
        p_attempt_id: attemptId,
        p_item_id: q.itemId,
        p_option_id: q.optionId,
        p_value_numeric: q.value,
        p_client_elapsed_ms: q.elapsedMs,
        p_value_text: q.valueText,
        p_least_option_id: q.leastOptionId,
      });
      if (error) stillPending.push(q);
    }

    if (stillPending.length) {
      localStorage.setItem(queueKey, JSON.stringify(stillPending));
    } else {
      localStorage.removeItem(queueKey);
      setOffline(false);
    }
  }, [supabase, attemptId, queueKey]);

  const finish = useCallback(
    async (reason: "manual" | "timeout") => {
      setFinishing(true);
      await flushQueue();

      const { error } = await supabase.rpc("finish_attempt", { p_attempt_id: attemptId });
      if (error) {
        setFinishing(false);
        sileo.error({
          title: "No pudimos enviar tus respuestas",
          description: "Revisa tu conexión e inténtalo otra vez.",
        });
        return;
      }

      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      localStorage.removeItem(queueKey);

      sileo.success({
        title: reason === "timeout" ? "Se acabó el tiempo" : "Prueba enviada",
        description:
          reason === "timeout"
            ? "Registramos las respuestas que alcanzaste a dar."
            : "Tus respuestas quedaron registradas.",
      });

      router.replace(`/postulaciones/${applicationId}`);
      router.refresh();
    },
    [flushQueue, supabase, attemptId, queueKey, router, applicationId],
  );

  // Countdown. El servidor sigue siendo la autoridad: aqui solo se muestra.
  useEffect(() => {
    if (deadlineMs === null) return;

    const id = setInterval(() => {
      if (disqualifiedRef.current) return;
      const left = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        void finish("timeout");
      }
    }, 1000);

    return () => clearInterval(id);
  }, [deadlineMs, finish]);

  // Heartbeat: deja rastro de las desconexiones que el cliente no puede reportar.
  useEffect(() => {
    const id = setInterval(async () => {
      if (disqualifiedRef.current) return;
      const { error } = await supabase.rpc("attempt_heartbeat", { p_attempt_id: attemptId });
      setOffline(Boolean(error));
      if (!error) void flushQueue();
    }, HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [supabase, attemptId, flushQueue]);

  // Señales de integridad: se registran y, al superar el umbral de "strikes"
  // (cambio de pestaña / salida de pantalla completa), la prueba actual se
  // descalifica. El aviso previo (banner) y las advertencias progresivas
  // aseguran que nunca sea una sorpresa para el candidato.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) logEvent("tab_hidden", "warn");
    };
    const onBlur = () => logEvent("window_blur", "info");
    const onFullscreen = () => {
      if (!document.fullscreenElement) logEvent("fullscreen_exit", "warn");
    };
    const block = (type: ProctorEvent) => (e: Event) => {
      e.preventDefault();
      logEvent(type, "warn");
    };
    const onCopy = block("copy");
    const onPaste = block("paste");
    const onContext = block("contextmenu");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [logEvent]);

  useEffect(() => {
    itemShownAt.current = Date.now();
    const t = setTimeout(() => void flushQueue(), 0);
    return () => clearTimeout(t);
  }, [flushQueue]);

  async function submitAndAdvance() {
    if (disqualifiedRef.current || !current || !isAnswerable(selected, current)) return;
    setSaving(true);

    const answer = selected as Answer;
    const elapsedMs = Date.now() - itemShownAt.current;
    const { data, error } = await supabase.rpc("save_response", {
      p_attempt_id: attemptId,
      p_item_id: current.id,
      p_option_id: answer.optionId,
      p_value_numeric: answer.value,
      p_client_elapsed_ms: elapsedMs,
      p_value_text: answer.valueText,
      p_least_option_id: answer.leastOptionId,
    });

    if (error) {
      // Sin conexión se encola; el upsert del servidor hace el reenvío idempotente.
      const raw = localStorage.getItem(queueKey);
      const queue: QueueItem[] = raw ? JSON.parse(raw) : [];
      queue.push({
        itemId: current.id,
        optionId: answer.optionId,
        value: answer.value,
        valueText: answer.valueText,
        leastOptionId: answer.leastOptionId,
        elapsedMs,
      });
      localStorage.setItem(queueKey, JSON.stringify(queue));
      setOffline(true);
    } else {
      const payload = data as { seconds_remaining: number | null } | null;
      if (payload?.seconds_remaining != null) {
        setDeadlineMs(Date.now() + payload.seconds_remaining * 1000);
      }
      setOffline(false);
    }

    setAnswers((prev) => new Map(prev).set(current.id, answer));
    setSaving(false);

    if (isLast) {
      void finish("manual");
    } else {
      itemShownAt.current = Date.now();
      setSelected(null);
      setFreeText("");
      setIndex((i) => i + 1);
    }
  }

  if (disqualifiedReason) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-4">
        <Card className="max-w-md border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <CardTitle className="text-base font-bold">Prueba cancelada por integridad</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{disqualifiedReason}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta prueba en particular queda descalificada y no se puede reintentar, pero puedes
              continuar con las demás pruebas de tu postulación con normalidad.
            </p>
            <Button
              onClick={() => {
                router.replace(`/postulaciones/${applicationId}`);
                router.refresh();
              }}
            >
              Ir a mi postulación
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-full max-w-3xl rounded-full bg-accent/35 blur-3xl -z-10"
      />

      <WatermarkOverlay identity={identity} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6 py-8 sm:py-12">
        <header className="grid gap-3.5 rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-[0_10px_30px_-10px_rgba(11,43,64,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-heading text-sm font-bold text-foreground">{state.test.name}</span>

            {remaining !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold tabular-nums border ${
                  remaining <= 60
                    ? "bg-destructive/10 border-destructive/30 text-destructive animate-pulse"
                    : "bg-secondary/80 border-border/50 text-foreground"
                }`}
              >
                <Timer className="size-3.5" />
                {clockFromSeconds(remaining)}
              </span>
            )}
          </div>

          <Progress value={progress} />

          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>
              Pregunta {index + 1} de {items.length}
            </span>
            {offline && (
              <span className="flex items-center gap-1 text-destructive font-semibold">
                <AlertTriangle className="size-3" />
                Sin conexión — guardando localmente
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
              strikes > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary/60 text-muted-foreground"
            }`}
          >
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>
              Esta prueba registra cambios de pestaña y salidas de pantalla completa. Al llegar a{" "}
              {STRIKE_THRESHOLD} incidencias se cancela automáticamente.
              {strikes > 0 && ` Incidencias actuales: ${strikes}/${STRIKE_THRESHOLD}.`}
            </span>
          </div>
        </header>

        <Card key={current.id} className="mt-6 flex-1 animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <CardHeader>
            <CardTitle className="text-base leading-relaxed font-normal">{current.stem}</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-2">
            {current.media_url && (
              <FadeImage
                src={current.media_url}
                alt="Lámina de la pregunta"
                className="mx-auto mb-2 h-72 w-full max-w-sm"
              />
            )}

            {current.type === "likert" ? (
              likertLabels.map((l) => (
                <ChoiceButton
                  key={l.value}
                  label={l.label}
                  active={selected?.value === l.value}
                  onClick={() => setSelected({ optionId: null, value: l.value, valueText: null, leastOptionId: null })}
                />
              ))
            ) : current.type === "mcq_image" ? (
              <div className="grid grid-cols-4 gap-2">
                {current.options.map((o) => (
                  <ImageChoiceButton
                    key={o.id}
                    label={o.label}
                    mediaUrl={o.media_url}
                    active={selected?.optionId === o.id}
                    onClick={() => setSelected({ optionId: o.id, value: null, valueText: null, leastOptionId: null })}
                  />
                ))}
              </div>
            ) : current.type === "free_response" ? (
              <Input
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={freeText}
                onChange={(e) => {
                  const text = e.target.value;
                  setFreeText(text);
                  setSelected({ optionId: null, value: null, valueText: text, leastOptionId: null });
                }}
                placeholder="Escribe tu respuesta…"
              />
            ) : current.type === "forced_choice" && current.options.length === 2 ? (
              <>
                <p className="mb-1 text-xs text-muted-foreground">
                  Elige la proposición con la que estés MÁS de acuerdo.
                </p>
                {current.options.map((o) => (
                  <ChoiceButton
                    key={o.id}
                    label={o.label}
                    active={selected?.optionId === o.id}
                    onClick={() => setSelected({ optionId: o.id, value: null, valueText: null, leastOptionId: null })}
                  />
                ))}
              </>
            ) : current.type === "forced_choice" ? (
              <>
                <p className="mb-1 text-xs text-muted-foreground">
                  Marca la frase que MÁS se parece a ti y la que MENOS se parece a ti.
                </p>
                {current.options.map((o) => (
                  <ForcedChoiceRow
                    key={o.id}
                    label={o.label}
                    isMost={selected?.optionId === o.id}
                    isLeast={selected?.leastOptionId === o.id}
                    onMost={() =>
                      setSelected((prev) => ({
                        optionId: o.id,
                        value: null,
                        valueText: null,
                        leastOptionId: prev?.leastOptionId === o.id ? null : (prev?.leastOptionId ?? null),
                      }))
                    }
                    onLeast={() =>
                      setSelected((prev) => ({
                        optionId: prev?.optionId === o.id ? null : (prev?.optionId ?? null),
                        value: null,
                        valueText: null,
                        leastOptionId: o.id,
                      }))
                    }
                  />
                ))}
              </>
            ) : (
              current.options.map((o) => (
                <ChoiceButton
                  key={o.id}
                  label={o.label}
                  active={selected?.optionId === o.id}
                  onClick={() => setSelected({ optionId: o.id, value: null, valueText: null, leastOptionId: null })}
                />
              ))
            )}
          </CardContent>
        </Card>

        <footer className="mt-6 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            No podrás volver a esta pregunta después de continuar.
          </p>
          <Button
            size="lg"
            disabled={!isAnswerable(selected, current) || saving || finishing}
            onClick={submitAndAdvance}
          >
            {finishing
              ? "Enviando…"
              : saving
                ? "Guardando…"
                : isLast
                  ? "Finalizar prueba"
                  : "Siguiente"}
          </Button>
        </footer>
      </main>
    </div>
  );
}

function ChoiceButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all shadow-xs ${
        active
          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
          : "border-border/70 bg-card hover:bg-secondary/60 text-foreground/90"
      }`}
    >
      {label}
    </button>
  );
}

function ForcedChoiceRow({
  label,
  isMost,
  isLeast,
  onMost,
  onLeast,
}: {
  label: string;
  isMost: boolean;
  isLeast: boolean;
  onMost: () => void;
  onLeast: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all shadow-xs ${
        isMost
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : isLeast
            ? "border-destructive bg-destructive/10 ring-1 ring-destructive/40"
            : "border-border/70 bg-card"
      }`}
    >
      <span className="flex-1 font-medium">{label}</span>
      <button
        type="button"
        aria-pressed={isMost}
        aria-label="Más se parece a mí"
        onClick={onMost}
        className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition-all ${
          isMost ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border/80 hover:bg-secondary"
        }`}
      >
        +
      </button>
      <button
        type="button"
        aria-pressed={isLeast}
        aria-label="Menos se parece a mí"
        onClick={onLeast}
        className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition-all ${
          isLeast ? "border-destructive bg-destructive text-destructive-foreground shadow-xs" : "border-border/80 hover:bg-secondary"
        }`}
      >
        −
      </button>
    </div>
  );
}

function ImageChoiceButton({
  label,
  mediaUrl,
  active,
  onClick,
}: {
  label: string;
  mediaUrl: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`grid place-items-center rounded-2xl border p-3 transition-all shadow-xs ${
        active
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border/70 bg-card hover:bg-secondary/60"
      }`}
    >
      {mediaUrl ? (
        <FadeImage src={mediaUrl} alt={label} className="aspect-square w-full max-w-24" />
      ) : (
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      )}
    </button>
  );
}

// Imagen con esqueleto mientras carga y aparicion suave al terminar, para que
// el cambio de pregunta no se sienta brusco ni parezca que algo se rompio
// mientras la miniatura todavia esta llegando.
function FadeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`relative block overflow-hidden rounded-2xl border border-border/70 ${className ?? ""}`}>
      <span
        aria-hidden
        className={`absolute inset-0 animate-pulse bg-muted/40 transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal. */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative h-full w-full select-none object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
