import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

// Cliente con service_role: solo para operaciones de servidor que necesitan
// saltarse RLS (subir/firmar archivos del bucket privado de estimulos). Nunca
// importar esto desde codigo que corra en el navegador.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no están configuradas en las variables de entorno (.env o .env.local). " +
      "Obtén la 'service_role key' desde tu Dashboard de Supabase (Project Settings > API Keys) y agrégala a tu archivo .env.",
    );
  }

  return createClient<Database>(
    url,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
