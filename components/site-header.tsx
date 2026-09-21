import Link from "next/link";
import { ClipboardCheck, LogOut } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/dal";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-heading font-medium">
          <ClipboardCheck className="size-5" />
          Evalua
        </Link>

        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" render={<Link href="/convocatorias" />}>
            Convocatorias
          </Button>

          {session ? (
            <>
              {session.role === "admin" && (
                <Button variant="ghost" size="sm" render={<Link href="/admin/convocatorias" />}>
                  Administración
                </Button>
              )}
              <Button size="sm" render={<Link href="/panel" />}>
                Mi panel
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm" aria-label="Cerrar sesión">
                  <LogOut data-icon="inline-start" />
                  Salir
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
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
