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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#672d15] text-[#fcfaf5]">
      {/* Elementos ambientales de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-radial from-[#d9a771]/25 to-transparent blur-3xl -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-radial from-[#133827]/60 to-transparent blur-3xl -z-10"
      />

      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className="tactile-card-forest w-full max-w-md border border-white/14 overflow-hidden shadow-[0_32px_75px_-15px_rgba(0,0,0,0.8)]">
          <div className="p-8 pb-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d9a771]">
              registro de postulante · Evalua - witmind
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white">
              Crea tu cuenta
            </h1>
            <div className="mx-auto mt-2.5 mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771]" />
            <p className="text-sm text-[#d4c1b0]">
              Con una sola cuenta puedes postular y rendir tus evaluaciones psicométricas.
            </p>
          </div>

          <div className="p-8 pt-2 grid gap-6">
            <AuthForm mode="signup" next={target} />
            <p className="text-center text-sm text-[#8fa697]">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(target)}`}
                className="font-medium text-[#d9a771] underline-offset-4 hover:underline hover:text-white transition-colors"
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
