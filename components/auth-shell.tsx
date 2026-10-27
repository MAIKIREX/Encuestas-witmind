import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

// Marco único de las pantallas de acceso (ingresar, registro, recuperar,
// nueva contraseña): mismo fondo, misma tarjeta y mismo ritmo vertical.
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
        <div className="tactile-card-forest w-full max-w-md overflow-hidden">
          <div className="px-6 pt-8 pb-2 text-center sm:px-8">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-accent" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="grid gap-6 px-6 pt-6 pb-8 sm:px-8">
            {children}
            {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

export const authLinkClass =
  "font-medium text-accent underline underline-offset-4 hover:text-foreground transition-colors";
