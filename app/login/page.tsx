import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
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
            <CardTitle className="text-lg">Ingresa a tu cuenta</CardTitle>
            <CardDescription>Continúa con tu evaluación o revisa tus postulaciones.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <AuthForm mode="login" next={target} />
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link
                href={`/registro?next=${encodeURIComponent(target)}`}
                className="text-foreground underline underline-offset-4"
              >
                Crear una
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
