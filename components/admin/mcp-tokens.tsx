"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { sileo } from "sileo";

import { createMcpToken, revokeMcpToken } from "@/app/actions/mcp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

export function NewMcpTokenForm({ endpoint }: { endpoint: string }) {
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const command = token
    ? `claude mcp add --transport http plataforma ${endpoint} --header "Authorization: Bearer ${token}"`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await createMcpToken(name);
            if ("error" in result) {
              sileo.error({ title: "No se pudo crear", description: result.error });
              return;
            }
            setToken(result.token);
            setName("");
          });
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del token (ej. Claude Code de Miguel)"
          maxLength={80}
          aria-label="Nombre del token"
        />
        <Button type="submit" disabled={pending || !name.trim()} className="shrink-0">
          <KeyRound className="size-4" />
          {pending ? "Generando…" : "Generar token"}
        </Button>
      </form>

      {token && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-950/30 p-4 flex flex-col gap-3">
          <p className="text-sm text-amber-200">
            Copia el token ahora: por seguridad no se volverá a mostrar.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-xl bg-black/40 px-3 py-2 text-xs text-white">
              {token}
            </code>
            <CopyButton value={token} label="Copiar token" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-xl bg-black/40 px-3 py-2 text-xs text-[#e5d8cc]">
              {command}
            </code>
            <CopyButton value={command} label="Copiar comando" />
          </div>
          <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => setToken(null)}>
            Ya lo guardé
          </Button>
        </div>
      )}
    </div>
  );
}

export function RevokeMcpTokenButton({ tokenId, name }: { tokenId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Revocar el token «${name}»? Los clientes que lo usen dejarán de conectarse.`)) {
          return;
        }
        startTransition(async () => {
          const result = await revokeMcpToken(tokenId);
          if (result.error) {
            sileo.error({ title: "No se pudo revocar", description: result.error });
          } else {
            sileo.success({ title: "Token revocado", description: `«${name}» ya no tiene acceso.` });
          }
        });
      }}
    >
      {pending ? "Revocando…" : "Revocar"}
    </Button>
  );
}
