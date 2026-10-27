import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { AuthShell, authLinkClass } from "@/components/auth-shell";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const session = await getSession();
  if (session) redirect("/panel");

  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/panel";

  return (
    <AuthShell
      eyebrow="Registro de postulante"
      title="Crea tu cuenta"
      description="Con una sola cuenta puedes postular y rendir tus evaluaciones psicométricas."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={`/login?next=${encodeURIComponent(target)}`} className={authLinkClass}>
            Ingresar
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" next={target} />
    </AuthShell>
  );
}
