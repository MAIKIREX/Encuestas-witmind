import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { AuthShell, authLinkClass } from "@/components/auth-shell";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect("/panel");

  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/panel";

  return (
    <AuthShell
      eyebrow="Acceso a postulantes"
      title="Ingresa a tu cuenta"
      description="Continúa con tus pruebas psicométricas o revisa tus postulaciones."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href={`/registro?next=${encodeURIComponent(target)}`} className={authLinkClass}>
            Crear una cuenta
          </Link>
        </>
      }
    >
      <AuthForm mode="login" next={target} />
    </AuthShell>
  );
}
