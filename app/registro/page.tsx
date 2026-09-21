import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const session = await getSession();
  if (session) redirect("/panel");

  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/panel";

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
              nuevo candidato
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground">
              Crea tu cuenta
            </h1>
            <div className="mx-auto mt-2.5 mb-3 h-1 w-8 rounded-full bg-primary" />
            <p className="text-sm text-muted-foreground">
              Con una sola cuenta puedes postular a todas las convocatorias abiertas.
            </p>
          </div>

          <div className="p-8 pt-2 grid gap-6">
            <AuthForm mode="signup" next={target} />
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(target)}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Ingresar
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
