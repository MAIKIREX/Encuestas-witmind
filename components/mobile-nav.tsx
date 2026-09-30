"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type Role = "admin" | "candidate" | null;

const itemClass =
  "flex h-11 w-full items-center rounded-xl px-4 text-sm font-medium text-foreground hover:bg-white/5";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={ref} className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="rounded-full text-foreground hover:bg-white/5"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <nav
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full mt-2 flex flex-col gap-1 rounded-3xl border border-white/10 bg-[#0d241a]/95 p-2 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <Link href="/convocatorias" className={itemClass} onClick={close}>
            Convocatorias
          </Link>
          {role === "admin" && (
            <Link href="/admin/convocatorias" className={itemClass} onClick={close}>
              Administración
            </Link>
          )}
          {role === "candidate" && (
            <Link href="/panel" className={itemClass} onClick={close}>
              Mi panel
            </Link>
          )}
          {role ? (
            <form action={signOut}>
              <button type="submit" className={`${itemClass} gap-2 text-muted-foreground`}>
                <LogOut className="size-4" />
                Salir
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className={itemClass} onClick={close}>
                Ingresar
              </Link>
              <Button
                className="mt-1 h-11 w-full rounded-xl font-semibold"
                render={<Link href="/registro" onClick={close} />}
              >
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
