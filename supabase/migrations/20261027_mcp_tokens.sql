-- Tokens de acceso al endpoint MCP remoto (/api/mcp), gestionados desde
-- Admin → MCP. Solo se guarda el hash SHA-256 del token; el valor completo se
-- muestra una única vez al crearlo.
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  token_hash text not null unique,
  token_prefix text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists mcp_tokens_active_idx
  on public.mcp_tokens (token_hash)
  where revoked_at is null;

alter table public.mcp_tokens enable row level security;

-- Solo administradores ven y gestionan tokens desde la app. El endpoint valida
-- con service_role, que no pasa por RLS.
drop policy if exists "mcp_tokens_admin_select" on public.mcp_tokens;
create policy "mcp_tokens_admin_select" on public.mcp_tokens
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "mcp_tokens_admin_insert" on public.mcp_tokens;
create policy "mcp_tokens_admin_insert" on public.mcp_tokens
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "mcp_tokens_admin_update" on public.mcp_tokens;
create policy "mcp_tokens_admin_update" on public.mcp_tokens
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.mcp_tokens from anon;
