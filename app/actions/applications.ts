"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function applyToJob(jobId: string, jobSlug: string) {
  const session = await getSession();
  if (!session) redirect(`/login?next=/convocatorias/${jobSlug}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_to_job", { p_job_id: jobId });

  if (error) return { error: "No pudimos registrar tu postulación. Vuelve a intentarlo." };

  redirect(`/postulaciones/${data}`);
}
