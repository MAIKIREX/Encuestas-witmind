import Link from "next/link";

import { AuthShell, authLinkClass } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Actualizar contraseña" };

export default async function ActualizarContrasenaPage() {
  const session = await getSession();

  return (
    <AuthShell
      eyebrow="Seguridad de tu cuenta"
      title={session ? "Elige tu nueva contraseña" : "Enlace no válido"}
      description={
        session
          ? "Escribe la contraseña que quieres usar de ahora en adelante."
          : "Este enlace venció o ya se usó. Solicita uno nuevo para continuar."
      }
    >
      {session ? (
        <UpdatePasswordForm />
      ) : (
        <Link href="/recuperar" className={`${authLinkClass} text-center text-sm`}>
          Solicitar un nuevo enlace
        </Link>
      )}
    </AuthShell>
  );
}
