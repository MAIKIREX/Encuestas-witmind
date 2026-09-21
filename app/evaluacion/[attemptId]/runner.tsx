"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Timer } from "lucide-react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { clockFromSeconds } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AttemptState, LikertLabel, ProctorEvent } from "@/lib/supabase/types";

type Answer = { optionId: string | null; value: number | null };
type QueueItem = { itemId: string; optionId: string | null; value: number | null; elapsedMs: number };

const HEARTBEAT_MS = 30_000;

function initialAnswers(state: AttemptState) {
  const map = new Map<string, Answer>();
  for (const [itemId, r] of Object.entries(state.responses ?? {})) {
    map.set(itemId, { optionId: r.option_id, value: r.value });
  }
  return map;
}

export function Runner({
  state,
  likertLabels,
  applicationId,
}: {
  state: AttemptState;
  likertLabels: LikertLabel[];
  applicationId: string;
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
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [offline, setOffline] = useState(false);

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
      void supabase.from("proctoring_events").insert({
        attempt_id: attemptId,
        event_type: eventType,
        severity,
        client_ts: new Date().toISOString(),
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
      const { error } = await supabase.rpc("attempt_heartbeat", { p_attempt_id: attemptId });
      setOffline(Boolean(error));
      if (!error) void flushQueue();
    }, HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [supabase, attemptId, flushQueue]);

  // Señales de integridad: se registran, no bloquean la prueba.
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
    if (!selected || !current) return;
    setSaving(true);

    const elapsedMs = Date.now() - itemShownAt.current;
    const { data, error } = await supabase.rpc("save_response", {
      p_attempt_id: attemptId,
      p_item_id: current.id,
      p_option_id: selected.optionId,
      p_value_numeric: selected.value,
      p_client_elapsed_ms: elapsedMs,
    });

    if (error) {
      // Sin conexión se encola; el upsert del servidor hace el reenvío idempotente.
      const raw = localStorage.getItem(queueKey);
      const queue: QueueItem[] = raw ? JSON.parse(raw) : [];
      queue.push({
        itemId: current.id,
        optionId: selected.optionId,
        value: selected.value,
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

    setAnswers((prev) => new Map(prev).set(current.id, selected));
    setSaving(false);

    if (isLast) {
      void finish("manual");
    } else {
      itemShownAt.current = Date.now();
      setSelected(null);
      setIndex((i) => i + 1);
    }
  }

  if (!current) return null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{state.test.name}</span>

          {remaining !== null && (
            <span
              className={`flex items-center gap-1.5 font-mono text-sm tabular-nums ${
                remaining <= 60 ? "text-destructive" : ""
              }`}
            >
              <Timer className="size-3.5" />
              {clockFromSeconds(remaining)}
            </span>
          )}
        </div>

        <Progress value={progress} />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Pregunta {index + 1} de {items.length}
          </span>
          {offline && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-3" />
              Sin conexión — tus respuestas se guardan y se reenvían
            </span>
          )}
        </div>
      </header>

      <Card className="mt-6 flex-1">
        <CardHeader>
          <CardTitle className="text-base leading-relaxed font-normal">{current.stem}</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-2">
          {current.type === "likert"
            ? likertLabels.map((l) => (
                <ChoiceButton
                  key={l.value}
                  label={l.label}
                  active={selected?.value === l.value}
                  onClick={() => setSelected({ optionId: null, value: l.value })}
                />
              ))
            : current.options.map((o) => (
                <ChoiceButton
                  key={o.id}
                  label={o.label}
                  active={selected?.optionId === o.id}
                  onClick={() => setSelected({ optionId: o.id, value: null })}
                />
              ))}
        </CardContent>
      </Card>

      <footer className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          No podrás volver a esta pregunta después de continuar.
        </p>
        <Button size="lg" disabled={!selected || saving || finishing} onClick={submitAndAdvance}>
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
      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
