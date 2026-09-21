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

export async function startTestPreview(testId: string) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/tests");
  if (session.role !== "admin") return { error: "Solo un administrador puede usar el modo prueba." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_admin_test_preview", { p_test_id: testId });

  if (error) return { error: "No pudimos iniciar el modo prueba. Vuelve a intentarlo." };

  redirect(`/postulaciones/${data}`);
}

export async function exitTestApplication(applicationId: string) {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_test_application", {
    p_application_id: applicationId,
  });

  if (error) return { error: "No pudimos salir del modo prueba. Vuelve a intentarlo." };

  redirect("/admin/tests");
}
