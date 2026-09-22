import Link from "next/link";
import { ClipboardCheck, LogOut } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/dal";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-3 z-50 w-full px-4 sm:px-6 pointer-events-none">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 rounded-full bg-[#0d241a]/85 backdrop-blur-xl border border-white/10 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.6)] pointer-events-auto transition-all">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-heading text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          {/* Isotipo con relieve tridimensional táctil estilo referencia */}
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ba5e30] to-[#7c3b1d] text-white shadow-[0_4px_12px_-2px_rgba(186,94,48,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-transform group-hover:scale-105">
            <ClipboardCheck className="size-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-foreground tracking-tight">Evalua</span>
            <span className="text-[11px] font-semibold tracking-widest text-[#d9a771] uppercase">· witmind</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full text-xs font-medium"
            render={<Link href="/convocatorias" />}
          >
            Convocatorias
          </Button>

          {session ? (
            <>
              {session.role === "admin" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full text-xs font-medium"
                  render={<Link href="/admin/convocatorias" />}
                >
                  Administración
                </Button>
              ) : (
                <Button size="sm" className="rounded-full text-xs font-medium" render={<Link href="/panel" />}>
                  Mi panel
                </Button>
              )}
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label="Cerrar sesión"
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full text-xs"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" />
                  Salir
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full text-xs font-medium"
                render={<Link href="/login" />}
              >
                Ingresar
              </Button>
              <Button
                size="sm"
                className="rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-[0_6px_20px_-4px_rgba(186,94,48,0.5)] hover:bg-[#ce6d3d]"
                render={<Link href="/registro" />}
              >
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
