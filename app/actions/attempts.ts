"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  PREVIOUS_TESTS_PENDING: "Debes completar las pruebas anteriores primero.",
  ATTEMPT_ALREADY_COMPLETED: "Ya rendiste esta prueba. Solo se permite un intento.",
  FORBIDDEN_OR_TEST_NOT_IN_ASSESSMENT: "Esta prueba no corresponde a tu postulación.",
};

export async function startAttempt(applicationId: string, testId: string) {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("start_attempt", {
    p_application_id: applicationId,
    p_test_id: testId,
  });

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { error: key ? ERRORS[key] : "No pudimos iniciar la prueba. Vuelve a intentarlo." };
  }

  redirect(`/evaluacion/${data}`);
}
