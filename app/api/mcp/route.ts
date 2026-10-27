// Endpoint MCP remoto (Streamable HTTP, sin sesion) para conectar Claude a la
// plataforma desplegada: https://<dominio>/api/mcp
//
// Protegido con `Authorization: Bearer <MCP_API_TOKEN>`. Si MCP_API_TOKEN no esta
// configurado, el endpoint queda deshabilitado (404).
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createHash, timingSafeEqual } from "node:crypto";

import { createPlatformMcpServer } from "@/lib/mcp/tools";
import { createServiceClient } from "@/lib/supabase/service";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request, token: string) {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  // Se comparan hashes para que timingSafeEqual reciba buffers del mismo largo.
  return provided.length > 0 && timingSafeEqual(digest(provided), digest(token));
}

function jsonRpcError(status: number, message: string, headers?: HeadersInit) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message }, id: null },
    { status, headers },
  );
}

async function handle(request: Request) {
  const token = process.env.MCP_API_TOKEN;
  if (!token) return jsonRpcError(404, "MCP no está habilitado en este servidor.");
  if (!isAuthorized(request, token)) {
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
