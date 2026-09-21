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
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Crea tu cuenta</CardTitle>
            <CardDescription>
              Con una sola cuenta puedes postular a todas las convocatorias abiertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <AuthForm mode="signup" next={target} />
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(target)}`}
                className="text-foreground underline underline-offset-4"
              >
                Ingresar
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
