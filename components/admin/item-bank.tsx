"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { sileo } from "sileo";

import { getMediaPreviewUrl, uploadItemMedia } from "@/app/actions/media";
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
  media_url: string | null;
  is_active: boolean;
  subscale_id: string | null;
  subscale_code: string | null;
  is_reverse: boolean;
  answer_key: { accepted: string[]; points: number } | null;
  options: {
    id: string;
    code: string;
    label: string;
    media_url: string | null;
    is_correct: boolean;
    points: number;
    forced_choice: { most?: string[]; least?: string[] } | null;
  }[];
};

export type Subscale = { id: string; code: string; name: string; display_order: number };
type DraftOption = {
  code: string;
  label: string;
  is_correct: boolean;
  points: number;
  media_url: string | null;
};

const CODES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function ItemBank({
  testId,
  strategy,
  subscales,
  items,
  mediaUrls,
}: {
  testId: string;
  strategy: ScoringStrategy;
  subscales: Subscale[];
  items: AdminItem[];
  mediaUrls: Record<string, string>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const isLikert = strategy === "likert_reverse";
  const isSjt = strategy === "sjt_weighted";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">
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
              mediaUrls={mediaUrls}
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
  mediaUrls,
  onEdit,
}: {
  testId: string;
  item: AdminItem;
  isSjt: boolean;
  mediaUrls: Record<string, string>;
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
          {item.type === "mcq_image" && <Badge variant="outline">Imagen</Badge>}
          {item.type === "free_response" && <Badge variant="outline">Respuesta libre</Badge>}
          {item.type === "forced_choice" && <Badge variant="outline">Elección forzada</Badge>}
          {item.subscale_code && <Badge variant="outline">{item.subscale_code}</Badge>}
          {item.is_reverse && <Badge variant="outline">Inverso</Badge>}
          {!item.is_active && <Badge variant="destructive">Inactiva</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-1.5">
        {item.media_url && (
          <MediaThumb
            path={item.media_url}
            url={mediaUrls[item.media_url]}
            alt={`Lámina de la pregunta ${item.position}`}
            size={160}
          />
        )}

        {item.type === "free_response" ? (
          <p className="text-sm text-muted-foreground">
            Respuestas aceptadas: {item.answer_key?.accepted.join(" · ") ?? "—"}
            {item.answer_key ? ` (${item.answer_key.points} pt${item.answer_key.points === 1 ? "" : "s"})` : ""}
          </p>
        ) : item.type === "forced_choice" ? (
          <div className="grid gap-1">
            {item.options.map((o) => (
              <p key={o.id} className="text-sm">
                <span className="font-medium">{o.code})</span> {o.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  +{(o.forced_choice?.most ?? []).join(",") || "—"} / −{(o.forced_choice?.least ?? []).join(",") || "—"}
                </span>
              </p>
            ))}
          </div>
        ) : item.type === "mcq_image" ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {item.options.map((o) => (
              <div key={o.id} className="grid gap-1">
                {o.media_url && (
                  <MediaThumb
                    path={o.media_url}
                    url={mediaUrls[o.media_url]}
                    alt={`Opción ${o.code}`}
                    size={64}
                    className={o.is_correct ? "ring-2 ring-primary" : undefined}
                  />
                )}
                <span className="text-center text-xs text-muted-foreground">
                  {o.code}
                  {o.is_correct ? " ✓" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          item.options.map((o) => (
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
          ))
        )}

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

// Miniatura de un estimulo guardado (bucket privado): resuelve una URL
// firmada de solo lectura para previsualizarlo en el admin.
function MediaThumb({
  path,
  url: providedUrl,
  alt,
  size,
  className,
}: {
  // `url` ya resuelta (firmada en lote por la pagina): evita que cada
  // miniatura dispare su propia llamada al servidor. `path` sigue sirviendo
  // de respaldo (y es lo unico que usa el formulario de edicion, que solo
  // muestra unas pocas imagenes a la vez).
  path?: string;
  url?: string;
  alt: string;
  size: number;
  className?: string;
}) {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const url = providedUrl ?? fetchedUrl;

  useEffect(() => {
    if (providedUrl || !path) return;
    let cancelled = false;
    void getMediaPreviewUrl(path).then((result) => {
      if (!cancelled && "url" in result && result.url) setFetchedUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [path, providedUrl]);

  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground animate-pulse"
      >
        …
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no apta para el optimizador de next/image.
    <img
      src={url}
      alt={alt}
      draggable={false}
      onLoad={() => setLoaded(true)}
      style={{ width: size, height: size }}
      className={`rounded-lg border border-border object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    />
  );
}

// Selector de imagen para el enunciado o una opcion de un item tipo imagen.
// Sube el archivo apenas se elige y guarda solo el path devuelto.
function MediaUploader({
  path,
  onChange,
  size = 96,
}: {
  path: string | null;
  onChange: (path: string | null) => void;
  size?: number;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadItemMedia(formData);
    setUploading(false);

    if ("error" in result) {
      sileo.error({ title: "No se pudo subir la imagen", description: result.error });
      return;
    }
    onChange(result.path);
  }

  return (
    <div className="flex items-center gap-2">
      {path ? (
        <div className="relative">
          <MediaThumb path={path} alt="Vista previa" size={size} />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Quitar imagen"
            className="absolute -top-2 -right-2 bg-background"
            onClick={() => onChange(null)}
          >
            <Trash2 />
          </Button>
        </div>
      ) : (
        <label
          style={{ width: size, height: size }}
          className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground hover:bg-muted"
        >
          {uploading ? "Subiendo…" : "Subir imagen"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
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
  const [mediaUrl, setMediaUrl] = useState<string | null>(item?.media_url ?? null);
  const [isImageMode, setIsImageMode] = useState(item?.type === "mcq_image");
  const [isFreeResponse, setIsFreeResponse] = useState(item?.type === "free_response");
  const [freeAccepted, setFreeAccepted] = useState(item?.answer_key?.accepted.join(", ") ?? "");
  const [freePoints, setFreePoints] = useState(item?.answer_key?.points ?? 1);
  const [subscaleId, setSubscaleId] = useState(item?.subscale_id ?? "");
  const [isReverse, setIsReverse] = useState(item?.is_reverse ?? false);
  const canBeImage = !isLikert && !isSjt;
  const canBeFreeResponse = !isLikert && !isSjt;
  const [options, setOptions] = useState<DraftOption[]>(
    item?.options.map((o) => ({
      code: o.code,
      label: o.label,
      is_correct: o.is_correct,
      points: Number(o.points),
      media_url: o.media_url,
    })) ??
      (isLikert
        ? []
        : CODES.slice(0, 4).map((code, i) => ({
            code,
            label: "",
            is_correct: false,
            points: isSjt ? 3 - i : 0,
            media_url: null,
          }))),
  );

  function updateOption(i: number, patch: Partial<DraftOption>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function save() {
    startTransition(async () => {
      const useImage = canBeImage && isImageMode;
      const useFreeResponse = canBeFreeResponse && isFreeResponse;
      const result = await upsertItem({
        testId,
        itemId: item?.id ?? null,
        stem,
        itemType: isLikert
          ? "likert"
          : isSjt
            ? "sjt"
            : useFreeResponse
              ? "free_response"
              : useImage
                ? "mcq_image"
                : "mcq_single",
        subscaleId: subscaleId || null,
        isReverse,
        mediaUrl: useImage ? mediaUrl : null,
        options: useFreeResponse
          ? []
          : options.map((o, i) => ({
              code: o.code,
              label: useImage ? o.label || `Opción ${o.code.toUpperCase()}` : o.label,
              display_order: i + 1,
              is_correct: isSjt ? o.points === 3 : o.is_correct,
              points: isSjt ? o.points : o.is_correct ? 1 : 0,
              media_url: useImage ? o.media_url : null,
            })),
        answerKey: useFreeResponse
          ? {
              accepted: freeAccepted
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
              points: freePoints,
            }
          : null,
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

        {canBeImage && !isFreeResponse && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isImageMode}
              onChange={(e) => setIsImageMode(e.target.checked)}
            />
            Pregunta basada en imagen (matriz, figura, etc.)
          </label>
        )}

        {canBeFreeResponse && !isImageMode && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFreeResponse}
              onChange={(e) => setIsFreeResponse(e.target.checked)}
            />
            Respuesta libre (el candidato escribe un número o texto corto)
          </label>
        )}

        {canBeFreeResponse && isFreeResponse && (
          <div className="grid gap-2">
            <Label htmlFor="free-accepted">Respuestas aceptadas (separadas por coma)</Label>
            <Textarea
              id="free-accepted"
              rows={2}
              value={freeAccepted}
              onChange={(e) => setFreeAccepted(e.target.value)}
              placeholder="ej. 60, 60c, 0.60"
            />
            <Label htmlFor="free-points">Puntos si acierta</Label>
            <Input
              id="free-points"
              type="number"
              min={0}
              step="0.5"
              value={freePoints}
              onChange={(e) => setFreePoints(Number(e.target.value))}
              className="w-24"
            />
          </div>
        )}

        {canBeImage && isImageMode && (
          <div className="grid gap-2">
            <Label>Lámina / imagen del enunciado</Label>
            <MediaUploader path={mediaUrl} onChange={setMediaUrl} size={160} />
          </div>
        )}

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
        ) : isFreeResponse ? null : (
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

                {canBeImage && isImageMode ? (
                  <MediaUploader
                    path={o.media_url}
                    onChange={(path) => updateOption(i, { media_url: path })}
                    size={72}
                  />
                ) : (
                  <Input
                    value={o.label}
                    onChange={(e) => updateOption(i, { label: e.target.value })}
                    placeholder={`Opción ${o.code}`}
                  />
                )}

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
                    { code: CODES[prev.length], label: "", is_correct: false, points: 0, media_url: null },
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
