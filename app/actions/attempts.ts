"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  PREVIOUS_TESTS_PENDING: "Debes completar las pruebas anteriores primero.",
  ATTEMPT_ALREADY_COMPLETED: "Ya rendiste esta prueba. Solo se permite un intento.",
  ATTEMPT_DISQUALIFIED:
    "Esta prueba fue descalificada por incidencias de integridad y no se puede reintentar.",
  FORBIDDEN_OR_TEST_NOT_IN_ASSESSMENT: "Esta prueba no corresponde a tu postulación.",
  GENDER_REQUIRED: "Esta prueba necesita que indiques tu sexo antes de comenzar.",
};

export async function startAttempt(applicationId: string, testId: string, gender?: "M" | "F") {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("start_attempt", {
    p_application_id: applicationId,
    p_test_id: testId,
    p_gender: gender ?? null,
  });

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { error: key ? ERRORS[key] : "No pudimos iniciar la prueba. Vuelve a intentarlo." };
  }

  redirect(`/evaluacion/${data}`);
}
