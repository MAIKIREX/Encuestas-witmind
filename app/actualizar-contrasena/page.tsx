import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/dal";

export const metadata = { title: "Actualizar contraseña" };

export default async function ActualizarContrasenaPage() {
  const session = await getSession();

  return (
    <>
      <SiteHeader />
      <main className="auth-shell flex flex-1 items-center justify-center px-4 py-12">
        <Card className="auth-card w-full max-w-md">
          <CardHeader className="auth-card-header">
            <CardTitle className="text-lg">
              {session ? "Elige tu nueva contraseña" : "Enlace no válido"}
            </CardTitle>
            <CardDescription>
              {session
                ? "Escribe la contraseña que quieres usar de ahora en adelante."
                : "Este enlace venció o ya se usó. Solicita uno nuevo para continuar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {session ? (
              <UpdatePasswordForm />
            ) : (
              <Link href="/recuperar" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Solicitar un nuevo enlace
              </Link>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
