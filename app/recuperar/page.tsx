import Link from "next/link";

import { RequestResetForm } from "@/components/request-reset-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/60 blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className="organic-floating-card w-full max-w-md bg-card border border-border/70 overflow-hidden">
          <div className="p-8 pb-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              seguridad de tu cuenta
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
              Recupera tu contraseña
            </h1>
            <div className="mx-auto mt-2.5 mb-3 h-1 w-8 rounded-full bg-primary" />
            <p className="text-sm text-muted-foreground">
              Escribe tu correo y te enviaremos un enlace seguro para restablecerla.
            </p>
          </div>

          <div className="p-8 pt-2 grid gap-6">
            <RequestResetForm />
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                ← Volver a ingresar
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
