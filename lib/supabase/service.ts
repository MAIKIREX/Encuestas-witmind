import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

// Cliente con service_role: solo para operaciones de servidor que necesitan
// saltarse RLS (subir/firmar archivos del bucket privado de estimulos). Nunca
// importar esto desde codigo que corra en el navegador.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
