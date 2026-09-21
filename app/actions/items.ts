"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ItemType } from "@/lib/supabase/types";

const optionSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1, "Cada opción necesita un texto"),
  display_order: z.number().int(),
  is_correct: z.boolean(),
  points: z.number(),
  media_url: z.string().nullable().optional(),
});

const answerKeySchema = z.object({
  accepted: z.array(z.string().min(1)).min(1, "Agrega al menos una respuesta aceptada"),
  points: z.number().min(0),
});

const itemSchema = z.object({
  testId: z.string().uuid(),
  itemId: z.string().uuid().nullable(),
  stem: z.string().min(10, "El enunciado debe tener al menos 10 caracteres"),
  itemType: z.enum(["mcq_single", "likert", "sjt", "mcq_image", "free_response", "forced_choice"]),
  subscaleId: z.string().uuid().nullable(),
  isReverse: z.boolean(),
  options: z.array(optionSchema),
  mediaUrl: z.string().nullable().optional(),
  answerKey: answerKeySchema.nullable().optional(),
});

export type ItemInput = z.input<typeof itemSchema>;

export async function upsertItem(input: ItemInput) {
  await requireAdmin();

  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { testId, itemId, stem, itemType, subscaleId, isReverse, options, mediaUrl, answerKey } = parsed.data;

  if (itemType === "free_response") {
    if (!answerKey || answerKey.accepted.length === 0) {
      return { error: "Agrega al menos una respuesta aceptada" };
    }
  } else if (itemType !== "likert") {
    if (options.length < 2) return { error: "Se necesitan al menos dos opciones" };
    if ((itemType === "mcq_single" || itemType === "mcq_image") && options.filter((o) => o.is_correct).length !== 1) {
      return { error: "Marca exactamente una opción como correcta" };
    }
    if (itemType === "mcq_image" && options.some((o) => !o.media_url)) {
      return { error: "Cada opción necesita una imagen" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_upsert_item", {
    p_test_id: testId,
    p_item_id: itemId,
    p_stem: stem,
    p_item_type: itemType as ItemType,
    p_subscale_id: subscaleId,
    p_options: options,
    p_is_reverse: isReverse,
    p_media_url: mediaUrl ?? null,
    p_answer_key: itemType === "free_response" ? answerKey : null,
  });

  if (error) return { error: "No pudimos guardar la pregunta." };

  revalidatePath(`/admin/tests/${testId}`);
  return { success: true };
}

export async function setItemActive(testId: string, itemId: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_item_active", {
    p_item_id: itemId,
    p_is_active: isActive,
  });

  if (error) return { error: "No pudimos actualizar la pregunta." };

  revalidatePath(`/admin/tests/${testId}`);
  return { success: true };
}
