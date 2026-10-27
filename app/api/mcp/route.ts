// Endpoint MCP remoto (Streamable HTTP, sin sesion) para conectar Claude a la
// plataforma desplegada: https://<dominio>/api/mcp
//
// Protegido con `Authorization: Bearer <token>`: un token creado en Admin → MCP
// o el token de respaldo MCP_API_TOKEN configurado en el servidor.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { isAuthorizedMcpRequest } from "@/lib/mcp/auth";
import { createPlatformMcpServer } from "@/lib/mcp/tools";
import { createServiceClient } from "@/lib/supabase/service";

function jsonRpcError(status: number, message: string, headers?: HeadersInit) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status, headers },
  );
}

async function handle(request: Request) {
  if (!(await isAuthorizedMcpRequest(request))) {
    return jsonRpcError(401, "No autorizado.", { "WWW-Authenticate": "Bearer" });
  }

  // Modo sin estado: un servidor y un transporte nuevos por peticion.
  const server = createPlatformMcpServer(createServiceClient());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
