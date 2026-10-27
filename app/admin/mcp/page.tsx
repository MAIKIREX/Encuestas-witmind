import { headers } from "next/headers";
import { Plug, Sparkles, Wrench } from "lucide-react";

import {
  CopyButton,
  NewMcpTokenForm,
  RevokeMcpTokenButton,
} from "@/components/admin/mcp-tokens";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "MCP · Administración" };

const TOOLS = [
  { name: "list_job_postings", description: "Lista las convocatorias, con filtro por estado." },
  { name: "list_tests", description: "Lista las pruebas con su estrategia de puntaje e ítems activos." },
  { name: "list_applications", description: "Lista postulaciones con el nombre del candidato." },
  {
    name: "get_application_results",
    description: "Puntajes, subescalas, banda e integridad de una postulación.",
  },
  { name: "get_job_summary", description: "Postulaciones por estado y promedio por prueba de una convocatoria." },
];

async function endpointUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/mcp`;
}

export default async function AdminMcpPage() {
  const endpoint = await endpointUrl();
  const supabase = await createClient();
  const { data: tokens, error } = await supabase
    .from("mcp_tokens")
    .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });

  const active = (tokens ?? []).filter((t) => !t.revoked_at);
  const revoked = (tokens ?? []).filter((t) => t.revoked_at);

  return (
    <main className="page-main [--page-max:64rem]">
      <div className="pb-8 border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/15 backdrop-blur-md mb-3">
          <Sparkles className="size-3.5 text-[#d9a771]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#d9a771]">
            Integraciones
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Conexión MCP con Claude
        </h1>
        <div className="mt-2.5 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#b0512a] to-[#d9a771]" />
        <p className="mt-3 text-sm sm:text-base text-[#e5d8cc] max-w-2xl leading-relaxed">
          Permite que Claude consulte convocatorias, postulaciones y resultados en modo de solo
          lectura. Cada token da acceso a los datos de todos los candidatos: entrégalo solo a
          administradores y revócalo cuando deje de usarse.
        </p>
      </div>

      <section className="mt-8 tactile-card-forest p-5 sm:p-7 rounded-[2rem] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Plug className="size-5 text-[#d9a771]" />
          <h2 className="text-lg font-bold text-white">Endpoint</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <code className="flex-1 min-w-0 break-all rounded-xl bg-black/40 px-3 py-2 text-sm text-white">
            {endpoint}
          </code>
          <CopyButton value={endpoint} label="Copiar URL" />
        </div>
        <p className="text-sm text-[#d4c1b0]">
          Transporte HTTP con cabecera <code>Authorization: Bearer &lt;token&gt;</code>. Funciona en
          Claude Code y en clientes MCP que permiten cabeceras; los conectores de claude.ai requieren
          OAuth y todavía no son compatibles.
        </p>
      </section>

      <section className="mt-6 tactile-card-terracotta p-5 sm:p-7 rounded-[2rem] flex flex-col gap-5">
        <h2 className="text-lg font-bold text-white">Tokens de acceso</h2>

        {error ? (
          <p className="text-sm text-amber-200">
            La tabla <code>mcp_tokens</code> aún no existe en la base de datos. Ejecuta la migración{" "}
            <code>supabase/migrations/20261027_mcp_tokens.sql</code> en el SQL Editor de Supabase para
            gestionar tokens desde aquí.
          </p>
        ) : (
          <>
            <NewMcpTokenForm endpoint={endpoint} />

            {active.length === 0 ? (
              <p className="text-sm text-[#e5d8cc]">No hay tokens activos.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {active.map((token) => (
                  <li
                    key={token.id}
                    className="rounded-2xl bg-black/30 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white break-words">{token.name}</p>
                      <p className="text-xs text-[#d4c1b0]">
                        <code>{token.token_prefix}…</code> · creado {formatDateTime(token.created_at)} ·
                        último uso {token.last_used_at ? formatDateTime(token.last_used_at) : "nunca"}
                      </p>
                    </div>
                    <RevokeMcpTokenButton tokenId={token.id} name={token.name} />
                  </li>
                ))}
              </ul>
            )}

            {revoked.length > 0 && (
              <details className="text-sm text-[#d4c1b0]">
                <summary className="cursor-pointer">Revocados ({revoked.length})</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {revoked.map((token) => (
                    <li key={token.id}>
                      {token.name} · <code>{token.token_prefix}…</code> · revocado{" "}
                      {formatDateTime(token.revoked_at)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section className="mt-6 tactile-card-forest p-5 sm:p-7 rounded-[2rem] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="size-5 text-[#d9a771]" />
          <h2 className="text-lg font-bold text-white">Herramientas disponibles</h2>
        </div>
        <ul className="flex flex-col gap-2">
          {TOOLS.map((tool) => (
            <li key={tool.name} className="text-sm text-[#e5d8cc]">
              <code className="text-white">{tool.name}</code> — {tool.description}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#d4c1b0]">
          Solo lectura. No devuelve documento, teléfono, fecha de nacimiento ni claves de respuesta.
        </p>
      </section>
    </main>
  );
}
