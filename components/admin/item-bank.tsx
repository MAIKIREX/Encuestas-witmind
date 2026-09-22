"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { sileo } from "sileo";

import { getMediaPreviewUrl, uploadItemMedia } from "@/app/actions/media";
import { setItemActive, upsertItem } from "@/app/actions/items";
import { Button } from "@/components/ui/button";
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
    <section className="mt-10">
      {/* Barra superior de conteo y acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-white tracking-tight">
            Reactivos y Preguntas
          </h2>
          <p className="text-xs sm:text-sm text-[#e5d8cc] mt-1">
            {items.length} {items.length === 1 ? "reactivo registrado" : "reactivos registrados"} para esta prueba psicométrica
          </p>
        </div>
        {editing !== "new" && (
          <Button
            size="sm"
            className="h-10 px-5 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs sm:text-sm shadow-[0_8px_18px_-4px_rgba(186,94,48,0.6)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            onClick={() => setEditing("new")}
          >
            <Plus className="size-4" />
            Nueva pregunta
          </Button>
        )}
      </div>

      {editing === "new" && (
        <div className="mt-8">
          <ItemForm
            testId={testId}
            item={null}
            subscales={subscales}
            isLikert={isLikert}
            isSjt={isSjt}
            onDone={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-6">
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

  // Limpiar numeración duplicada si el enunciado ya venía con "1. ..."
  const cleanStem =
    item.stem.replace(new RegExp(`^\\s*${item.position}[\\.\\)]\\s*`, "i"), "").trim() ||
    item.stem;

  return (
    <div
      className={`p-6 sm:p-7 lg:p-8 rounded-[2rem] bg-gradient-to-br from-[#123826] to-[#0a2016] border border-white/14 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.65)] hover:border-white/25 transition-all ${
        item.is_active ? "" : "opacity-60 bg-black/40"
      }`}
    >
      {/* Encabezado del reactivo: Número, Enunciado y Badges */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="size-9 rounded-xl bg-black/50 border border-white/20 text-[#d9a771] font-mono text-sm font-bold flex items-center justify-center shrink-0 shadow-inner mt-0.5">
            #{item.position}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {cleanStem}
            </h3>
          </div>
        </div>

        {/* Badges de tipo / área */}
        <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
          {item.type === "mcq_image" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black/45 text-[#d9a771] border border-white/15 backdrop-blur-xs">
              Imagen
            </span>
          )}
          {item.type === "free_response" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black/45 text-[#f5d09f] border border-white/15 backdrop-blur-xs">
              Respuesta libre
            </span>
          )}
          {item.type === "forced_choice" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black/45 text-white border border-white/15 backdrop-blur-xs">
              Elección forzada
            </span>
          )}
          {item.subscale_code && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/25 backdrop-blur-xs">
              Área: {item.subscale_code}
            </span>
          )}
          {item.is_reverse && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/25 backdrop-blur-xs">
              Inverso
            </span>
          )}
          {!item.is_active && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-950/70 text-red-300 border border-red-500/30 backdrop-blur-xs">
              Inactiva
            </span>
          )}
        </div>
      </div>

      {/* Contenido de opciones y estímulos */}
      <div className="mt-6 pt-5 border-t border-white/10 grid gap-3">
        {item.media_url && (
          <div className="mb-2">
            <MediaThumb
              path={item.media_url}
              url={mediaUrls[item.media_url]}
              alt={`Lámina de la pregunta ${item.position}`}
              size={180}
            />
          </div>
        )}

        {item.type === "free_response" ? (
          <div className="p-4 rounded-2xl bg-black/35 border border-white/10 text-sm text-[#e5d8cc]">
            <span className="text-[#d9a771] font-semibold">Respuestas aceptadas:</span>{" "}
            {item.answer_key?.accepted.join(" · ") ?? "—"}
            {item.answer_key ? ` (${item.answer_key.points} pt${item.answer_key.points === 1 ? "" : "s"})` : ""}
          </div>
        ) : item.type === "forced_choice" ? (
          <div className="grid gap-2.5">
            {item.options.map((o) => (
              <div
                key={o.id}
                className="p-3.5 sm:p-4 rounded-xl bg-black/35 border border-white/10 text-sm sm:text-base text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="size-7.5 rounded-lg bg-black/50 border border-white/15 text-[#d9a771] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {o.code.toUpperCase()}
                  </span>
                  <span className="text-white/95 font-medium leading-snug">{o.label}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-black/50 border border-white/12 text-xs font-mono text-[#d9a771] shrink-0 self-start sm:self-auto">
                  +{(o.forced_choice?.most ?? []).join(",") || "—"} / −{(o.forced_choice?.least ?? []).join(",") || "—"}
                </span>
              </div>
            ))}
          </div>
        ) : item.type === "mcq_image" ? (
          <div className="mt-1 flex flex-wrap gap-4">
            {item.options.map((o) => (
              <div
                key={o.id}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-black/35 border border-white/10"
              >
                {o.media_url && (
                  <MediaThumb
                    path={o.media_url}
                    url={mediaUrls[o.media_url]}
                    alt={`Opción ${o.code}`}
                    size={80}
                    className={o.is_correct ? "ring-2 ring-[#d9a771] rounded-xl" : undefined}
                  />
                )}
                <span
                  className={`text-xs font-bold ${
                    o.is_correct ? "text-[#d9a771]" : "text-white/80"
                  }`}
                >
                  Opción {o.code.toUpperCase()}
                  {o.is_correct ? " ✓" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2.5">
            {item.options.map((o) => (
              <div
                key={o.id}
                className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl text-sm sm:text-base ${
                  o.is_correct
                    ? "bg-emerald-950/45 border border-emerald-500/30 text-white shadow-sm"
                    : "bg-black/30 border border-white/8 text-[#e5d8cc]"
                }`}
              >
                {o.is_correct ? (
                  <div className="size-5 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="size-3.5" />
                  </div>
                ) : (
                  <span className="size-5 shrink-0" />
                )}
                <span className="size-7 rounded-lg bg-black/50 border border-white/15 text-[#d9a771] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {o.code.toUpperCase()}
                </span>
                <span className={o.is_correct ? "font-semibold text-white flex-1" : "flex-1 text-white/90"}>
                  {o.label}
                </span>
                {isSjt && (
                  <span className="px-3 py-1 rounded-full bg-black/50 border border-white/12 text-xs font-mono text-[#d9a771] shrink-0">
                    {o.points} pts
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Barra de botones de acción amplia y cómoda */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            className="h-10 px-5 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs sm:text-sm shadow-[0_8px_18px_-4px_rgba(186,94,48,0.5)] hover:from-[#ce6d3d] hover:to-[#ba5e30] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Editar pregunta
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="h-10 px-4.5 rounded-full bg-black/40 border-white/20 text-[#fcfaf5] hover:bg-black/60 hover:text-white text-xs sm:text-sm transition-all flex items-center gap-2"
            onClick={() =>
              startTransition(async () => {
                const result = await setItemActive(testId, item.id, !item.is_active);
                if (result?.error) sileo.error({ title: "Error", description: result.error });
                else router.refresh();
              })
            }
          >
            {item.is_active ? (
              <>
                <EyeOff className="size-3.5 text-neutral-400" />
                Desactivar
              </>
            ) : (
              <>
                <Eye className="size-3.5 text-emerald-400" />
                Activar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
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
    <div className="p-6 sm:p-8 rounded-[2rem] bg-[#113023] border border-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] text-card-foreground">
      <div className="pb-5 mb-5 border-b border-white/12">
        <h3 className="font-heading text-xl font-bold text-white">
          {item ? `Editar pregunta ${item.position}` : "Nueva pregunta"}
        </h3>
        <p className="text-xs text-[#d4c1b0] mt-1">
          Configura el enunciado, modalidad de respuesta y claves de calificación.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="stem" className="text-xs font-semibold uppercase tracking-wider text-[#d9a771]">
            Enunciado
          </Label>
          <Textarea
            id="stem"
            rows={3}
            value={stem}
            onChange={(e) => setStem(e.target.value)}
            placeholder="Escribe la situación o pregunta…"
            className="bg-black/35 border-white/15 focus-visible:border-[#d9a771] text-white"
          />
        </div>

        {canBeImage && !isFreeResponse && (
          <label className="flex items-center gap-2.5 text-sm text-[#e5d8cc] cursor-pointer">
            <input
              type="checkbox"
              checked={isImageMode}
              onChange={(e) => setIsImageMode(e.target.checked)}
              className="size-4 accent-[#c96232] rounded"
            />
            Pregunta basada en imagen (matriz, figura, etc.)
          </label>
        )}

        {canBeFreeResponse && !isImageMode && (
          <label className="flex items-center gap-2.5 text-sm text-[#e5d8cc] cursor-pointer">
            <input
              type="checkbox"
              checked={isFreeResponse}
              onChange={(e) => setIsFreeResponse(e.target.checked)}
              className="size-4 accent-[#c96232] rounded"
            />
            Respuesta libre (el candidato escribe un número o texto corto)
          </label>
        )}

        {canBeFreeResponse && isFreeResponse && (
          <div className="grid gap-3 p-4 rounded-xl bg-black/30 border border-white/10">
            <Label htmlFor="free-accepted" className="text-xs font-semibold uppercase tracking-wider text-[#d9a771]">
              Respuestas aceptadas (separadas por coma)
            </Label>
            <Textarea
              id="free-accepted"
              rows={2}
              value={freeAccepted}
              onChange={(e) => setFreeAccepted(e.target.value)}
              placeholder="ej. 60, 60c, 0.60"
              className="bg-black/40 border-white/15 text-white"
            />
            <div className="flex items-center gap-3 mt-1">
              <Label htmlFor="free-points" className="text-xs font-semibold text-[#e5d8cc]">
                Puntos si acierta:
              </Label>
              <Input
                id="free-points"
                type="number"
                min={0}
                step="0.5"
                value={freePoints}
                onChange={(e) => setFreePoints(Number(e.target.value))}
                className="w-24 bg-black/40 border-white/15 text-white"
              />
            </div>
          </div>
        )}

        {canBeImage && isImageMode && (
          <div className="grid gap-2 p-4 rounded-xl bg-black/30 border border-white/10">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#d9a771]">
              Lámina / imagen del enunciado
            </Label>
            <MediaUploader path={mediaUrl} onChange={setMediaUrl} size={160} />
          </div>
        )}

        {subscales.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="subscale" className="text-xs font-semibold uppercase tracking-wider text-[#d9a771]">
              Área que mide
            </Label>
            <select
              id="subscale"
              value={subscaleId}
              onChange={(e) => setSubscaleId(e.target.value)}
              className="h-10 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white outline-none focus-visible:border-[#d9a771] focus-visible:ring-2 focus-visible:ring-[#d9a771]/50"
            >
              <option value="" className="bg-[#113023] text-white">Sin área asignada</option>
              {subscales.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#113023] text-white">
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLikert ? (
          <label className="flex items-center gap-2.5 text-sm text-[#e5d8cc] cursor-pointer">
            <input
              type="checkbox"
              checked={isReverse}
              onChange={(e) => setIsReverse(e.target.checked)}
              className="size-4 accent-[#c96232] rounded"
            />
            Ítem inverso (estar de acuerdo resta en lugar de sumar)
          </label>
        ) : isFreeResponse ? null : (
          <div className="grid gap-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#d9a771]">
                Opciones de respuesta
              </Label>
              <span className="text-xs text-[#d4c1b0]/80">
                {isSjt ? "3 = óptima · 0 = contraproducente" : "Marca la única correcta"}
              </span>
            </div>

            {options.map((o, i) => (
              <div key={o.code} className="flex items-center gap-2.5 p-2 rounded-xl bg-black/25 border border-white/8">
                <span className="w-5 text-center font-bold text-[#d9a771] text-sm">{o.code})</span>

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
                    className="bg-black/35 border-white/12 text-white text-sm"
                  />
                )}

                {isSjt ? (
                  <select
                    value={o.points}
                    onChange={(e) => updateOption(i, { points: Number(e.target.value) })}
                    className="h-9 w-18 rounded-lg border border-white/15 bg-black/50 px-2 text-sm text-white"
                  >
                    {[3, 2, 1, 0].map((p) => (
                      <option key={p} value={p} className="bg-[#113023] text-white">
                        {p} pts
                      </option>
                    ))}
                  </select>
                ) : (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={o.is_correct ? "default" : "outline"}
                    className={
                      o.is_correct
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shrink-0"
                        : "bg-black/40 border-white/20 text-[#d4c1b0] hover:text-white shrink-0"
                    }
                    aria-label="Marcar como correcta"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.map((x, idx) => ({ ...x, is_correct: idx === i })),
                      )
                    }
                  >
                    <Check className="size-4" />
                  </Button>
                )}

                {options.length > 2 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Quitar opción"
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/40 shrink-0"
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}

            {options.length < CODES.length && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-self-start h-8 px-3.5 rounded-full bg-black/40 border-white/20 text-[#fcfaf5] hover:bg-black/60 text-xs"
                onClick={() =>
                  setOptions((prev) => [
                    ...prev,
                    { code: CODES[prev.length], label: "", is_correct: false, points: 0, media_url: null },
                  ])
                }
              >
                <Plus className="size-3.5 mr-1" />
                Añadir opción
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/12">
          <Button
            disabled={pending}
            className="h-10 px-6 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#8c3f19] text-white font-semibold text-xs sm:text-sm shadow-[0_8px_18px_-4px_rgba(186,94,48,0.6)] hover:from-[#ce6d3d] hover:to-[#ba5e30] transition-all"
            onClick={save}
          >
            {pending ? "Guardando…" : "Guardar pregunta"}
          </Button>
          <Button
            variant="ghost"
            className="h-10 px-5 rounded-full text-[#d4c1b0] hover:text-white"
            onClick={onDone}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
