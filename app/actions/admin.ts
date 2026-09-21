"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const jobSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(20, "Describe el puesto con al menos 20 caracteres"),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  assessmentId: z.string().uuid("Selecciona una batería"),
});

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createJob(_prev: unknown, formData: FormData) {
  const session = await requireAdmin();

  const parsed = jobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location") || undefined,
    employmentType: formData.get("employmentType") || undefined,
    assessmentId: formData.get("assessmentId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;

  const { error } = await supabase.from("job_postings").insert({
    slug,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location ?? null,
    employment_type: parsed.data.employmentType ?? null,
    assessment_id: parsed.data.assessmentId,
    status: "draft",
    created_by: session.user.id,
  });

  if (error) return { error: "No pudimos crear la convocatoria." };

  revalidatePath("/admin/convocatorias");
  return { success: true };
}

export async function setJobStatus(jobId: string, status: "draft" | "published" | "closed") {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("job_postings")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  if (error) return { error: "No pudimos actualizar el estado." };

  revalidatePath("/admin/convocatorias");
  revalidatePath("/convocatorias");
  return { success: true };
}

export async function setApplicationStatus(
  applicationId: string,
  status: "shortlisted" | "rejected" | "hired" | "completed",
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) return { error: "No pudimos actualizar la postulación." };

  revalidatePath(`/admin/postulaciones/${applicationId}`);
  return { success: true };
}
