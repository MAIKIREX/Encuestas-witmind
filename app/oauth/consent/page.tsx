import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { decideOAuthAuthorization } from "@/app/actions/oauth";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Autorizar acceso · MCP" };

// Ruta configurada como "Authorization Path" del OAuth Server de Supabase. Supabase
// redirige aqui con `authorization_id` cuando un cliente (ej. claude.ai) pide acceso.
export default async function OAuthConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id: rawId } = await searchParams;
  const authorizationId = typeof rawId === "string" ? rawId : "";

  if (!authorizationId) {
    return <ConsentShell title="Solicitud inválida">Falta el identificador de autorización.</ConsentShell>;
  }

  const session = await getSession();
  if (!session) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !data) {
    return (
      <ConsentShell title="No se pudo cargar la solicitud">
        {error?.message ?? "La solicitud de autorización no existe o expiró. Vuelve a conectar desde Claude."}
      </ConsentShell>
    );
  }

  // Consentimiento previo: Supabase ya devuelve la URL de retorno.
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const isAdmin = session.role === "admin";

  return (
    <ConsentShell title={`Autorizar a ${data.client.name || "un cliente MCP"}`}>
      <div className="flex flex-col gap-4">
        <p>
          <strong className="text-white">{data.client.name || "Una aplicación"}</strong> quiere acceder a
          la plataforma con tu cuenta (<span className="text-white">{data.user.email}</span>) para
          consultar en modo de solo lectura convocatorias, postulaciones y resultados de candidatos.
        </p>

        <dl className="rounded-2xl bg-black/30 border border-white/10 p-4 text-sm grid gap-2">
          {data.client.uri && (
            <div>
              <dt className="text-[#d4c1b0]">Sitio del cliente</dt>
              <dd className="text-white break-all">{data.client.uri}</dd>
            </div>
          )}
          <div>
            <dt className="text-[#d4c1b0]">Volverá a</dt>
            <dd className="text-white break-all">{data.redirect_uri}</dd>
          </div>
          {data.scope?.trim() && (
            <div>
              <dt className="text-[#d4c1b0]">Permisos solicitados</dt>
              <dd className="text-white">{data.scope.split(" ").join(", ")}</dd>
            </div>
          )}
        </dl>

        {!isAdmin && (
          <p className="text-sm text-amber-200">
            Solo los administradores pueden conectar Claude a la plataforma. Rechaza la solicitud o
            ingresa con una cuenta de administrador.
          </p>
        )}

        <form action={decideOAuthAuthorization} className="flex flex-col sm:flex-row gap-3">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          {isAdmin && (
            <Button type="submit" name="decision" value="approve">
              Autorizar acceso
            </Button>
          )}
          <Button type="submit" name="decision" value="deny" variant="outline">
            Rechazar
          </Button>
        </form>
      </div>
    </ConsentShell>
  );
}

function ConsentShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 sm:px-6 py-16">
      <div className="tactile-card-forest p-6 sm:p-8 rounded-[2rem] flex flex-col gap-5 text-sm sm:text-base text-[#e5d8cc]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-6 text-[#d9a771]" />
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
