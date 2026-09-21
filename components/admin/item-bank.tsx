"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { sileo } from "sileo";

import { setItemActive, upsertItem } from "@/app/actions/items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ItemType, ScoringStrategy } from "@/lib/supabase/types";

export type AdminItem = {
  id: string;
  position: number;
  type: ItemType;
  stem: string;
  is_active: boolean;
  subscale_id: string | null;
  subscale_code: string | null;
  is_reverse: boolean;
  options: { id: string; code: string; label: string; is_correct: boolean; points: number }[];
};

export type Subscale = { id: string; code: string; name: string; display_order: number };
type DraftOption = { code: string; label: string; is_correct: boolean; points: number };

const CODES = ["a", "b", "c", "d", "e"];

export function ItemBank({
  testId,
  strategy,
  subscales,
  items,
}: {
  testId: string;
  strategy: ScoringStrategy;
  subscales: Subscale[];
  items: AdminItem[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const isLikert = strategy === "likert_reverse";
  const isSjt = strategy === "sjt_weighted";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-medium">
          {items.length} {items.length === 1 ? "pregunta" : "preguntas"}
        </h2>
        {editing !== "new" && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" />
            Nueva pregunta
          </Button>
        )}
      </div>

      {editing === "new" && (
        <ItemForm
          testId={testId}
          item={null}
          subscales={subscales}
          isLikert={isLikert}
          isSjt={isSjt}
          onDone={() => setEditing(null)}
        />
      )}

      <div className="mt-4 grid gap-3">
        {items.map((item) =>
          editing === item.id ? (
            <ItemForm
              key={item.id}
              testId={testId}
              item={item}
              subscales={subscales}
              isLikert={isLikert}
              isSjt={isSjt}
              onDone={() => setEditing(null)}
            />
          ) : (
            <ItemRow
              key={item.id}
              testId={testId}
              item={item}
              isSjt={isSjt}
              onEdit={() => setEditing(item.id)}
            />
          ),
        )}
      </div>
    </section>
  );
}

function ItemRow({
  testId,
  item,
  isSjt,
  onEdit,
}: {
  testId: string;
  item: AdminItem;
  isSjt: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card size="sm" className={item.is_active ? undefined : "opacity-60"}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-start gap-2 text-sm font-normal">
          <span className="text-muted-foreground tabular-nums">{item.position}.</span>
          <span className="flex-1">{item.stem}</span>
          {item.subscale_code && <Badge variant="outline">{item.subscale_code}</Badge>}
          {item.is_reverse && <Badge variant="outline">Inverso</Badge>}
          {!item.is_active && <Badge variant="destructive">Inactiva</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-1.5">
        {item.options.map((o) => (
          <div key={o.id} className="flex items-start gap-2 text-sm">
            {o.is_correct ? (
              <Check className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <span className="mt-0.5 w-3.5 shrink-0" />
            )}
            <span className={o.is_correct ? "font-medium" : "text-muted-foreground"}>
              {o.code}) {o.label}
            </span>
            {isSjt && (
              <span className="ml-auto tabular-nums text-muted-foreground">{o.points} pts</span>
            )}
          </div>
        ))}

        <div className="mt-2 flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setItemActive(testId, item.id, !item.is_active);
                if (result?.error) sileo.error({ title: "Error", description: result.error });
                else router.refresh();
              })
            }
          >
            {item.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemForm({
  testId,
  item,
  subscales,
  isLikert,
  isSjt,
  onDone,
}: {
  testId: string;
  item: AdminItem | null;
  subscales: Subscale[];
  isLikert: boolean;
  isSjt: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stem, setStem] = useState(item?.stem ?? "");
  const [subscaleId, setSubscaleId] = useState(item?.subscale_id ?? "");
  const [isReverse, setIsReverse] = useState(item?.is_reverse ?? false);
  const [options, setOptions] = useState<DraftOption[]>(
    item?.options.map((o) => ({
      code: o.code,
      label: o.label,
      is_correct: o.is_correct,
      points: Number(o.points),
    })) ??
      (isLikert
        ? []
        : CODES.slice(0, 4).map((code, i) => ({
            code,
            label: "",
            is_correct: false,
            points: isSjt ? 3 - i : 0,
          }))),
  );

  function updateOption(i: number, patch: Partial<DraftOption>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function save() {
    startTransition(async () => {
      const result = await upsertItem({
        testId,
        itemId: item?.id ?? null,
        stem,
        itemType: isLikert ? "likert" : isSjt ? "sjt" : "mcq_single",
        subscaleId: subscaleId || null,
        isReverse,
        options: options.map((o, i) => ({
          code: o.code,
          label: o.label,
          display_order: i + 1,
          is_correct: isSjt ? o.points === 3 : o.is_correct,
          points: isSjt ? o.points : o.is_correct ? 1 : 0,
        })),
      });

      if (result?.error) {
        sileo.error({ title: "No se pudo guardar", description: result.error });
        return;
      }

      sileo.success({
        title: item ? "Pregunta actualizada" : "Pregunta creada",
        description: "Los cambios ya están activos.",
      });
      onDone();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item ? `Editar pregunta ${item.position}` : "Nueva pregunta"}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="stem">Enunciado</Label>
          <Textarea
            id="stem"
            rows={3}
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            placeholder="Escribe la situación o pregunta…"
          />
        </div>

        {subscales.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="subscale">Área que mide</Label>
            <select
              id="subscale"
              value={subscaleId}
              onChange={(e) => setSubscaleId(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Sin área asignada</option>
              {subscales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLikert ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isReverse}
              onChange={(e) => setIsReverse(e.target.checked)}
            />
            Ítem inverso (estar de acuerdo resta en lugar de sumar)
          </label>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Opciones</Label>
              <span className="text-xs text-muted-foreground">
                {isSjt ? "3 = óptima · 0 = contraproducente" : "Marca la única correcta"}
              </span>
            </div>

            {options.map((o, i) => (
              <div key={o.code} className="flex items-center gap-2">
                <span className="w-4 text-sm text-muted-foreground">{o.code})</span>

                <Input
                  value={o.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  placeholder={`Opción ${o.code}`}
                />

                {isSjt ? (
                  <select
                    value={o.points}
                    onChange={(e) => updateOption(i, { points: Number(e.target.value) })}
                    className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {[3, 2, 1, 0].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={o.is_correct ? "default" : "outline"}
                    aria-label="Marcar como correcta"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.map((x, idx) => ({ ...x, is_correct: idx === i })),
                      )
                    }
                  >
                    <Check />
                  </Button>
                )}

                {options.length > 2 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Quitar opción"
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}

            {options.length < CODES.length && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-self-start"
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    { code: CODES[prev.length], label: "", is_correct: false, points: 0 },
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                Añadir opción
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button disabled={pending} onClick={save}>
            {pending ? "Guardando…" : "Guardar pregunta"}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
