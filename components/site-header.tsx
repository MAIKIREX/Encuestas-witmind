import Link from "next/link";
import { ClipboardCheck, LogOut } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/dal";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <ClipboardCheck className="size-4.5" />
          </div>
          <span>evalua</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
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
                  className="text-muted-foreground hover:text-foreground"
                  render={<Link href="/admin/convocatorias" />}
                >
                  Administración
                </Button>
              ) : (
                <Button size="sm" render={<Link href="/panel" />}>
                  Mi panel
                </Button>
              )}
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label="Cerrar sesión"
                  className="text-muted-foreground hover:text-foreground"
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
                className="text-muted-foreground hover:text-foreground"
                render={<Link href="/login" />}
              >
                Ingresar
              </Button>
              <Button size="sm" render={<Link href="/registro" />}>
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
