// Metadata de recurso protegido OAuth (RFC 9728). Los clientes MCP (claude.ai)
// la leen tras el 401 de /api/mcp para descubrir el servidor de autorizacion
// (Supabase Auth). Responde tanto en la ruta base como en la ruta con sufijo
// /.well-known/oauth-protected-resource/api/mcp.
import { authorizationServerUrl, MCP_PATH, publicOrigin } from "@/lib/mcp/oauth";

export function GET(request: Request) {
  const origin = publicOrigin(request);
  return Response.json(
    {
      resource: `${origin}${MCP_PATH}`,
      authorization_servers: [authorizationServerUrl()],
      bearer_methods_supported: ["header"],
      resource_name: "Plataforma de convocatorias",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
