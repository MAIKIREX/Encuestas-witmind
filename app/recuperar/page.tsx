import Link from "next/link";

import { RequestResetForm } from "@/components/request-reset-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Recupera tu contraseña</CardTitle>
            <CardDescription>
              Escribe el correo con el que te registraste y te enviaremos un enlace para
              restablecerla.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <RequestResetForm />
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Volver a ingresar
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
