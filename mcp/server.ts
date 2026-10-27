// Servidor MCP (stdio) local de solo lectura. Se registra en `.mcp.json` y se
// arranca con `npm run mcp`. La version remota vive en `app/api/mcp/route.ts`.
// IMPORTANTE: stdout es el canal del protocolo; todo log debe ir a stderr.
import { loadEnvConfig } from "@next/env";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

import { createPlatformMcpServer } from "../lib/mcp/tools";
import type { Database } from "../lib/supabase/types";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
  process.exit(1);
}

const db = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const server = createPlatformMcpServer(db);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("Servidor MCP 'plataforma' listo (stdio, solo lectura).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
