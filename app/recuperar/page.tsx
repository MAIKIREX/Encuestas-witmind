import Link from "next/link";

import { AuthShell, authLinkClass } from "@/components/auth-shell";
import { RequestResetForm } from "@/components/request-reset-form";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell
      eyebrow="Seguridad de tu cuenta"
      title="Recupera tu contraseña"
      description="Escribe tu correo y te enviaremos un enlace seguro para restablecerla."
      footer={
        <Link href="/login" className={authLinkClass}>
          ← Volver a ingresar
        </Link>
      }
    >
      <RequestResetForm />
    </AuthShell>
  );
}
