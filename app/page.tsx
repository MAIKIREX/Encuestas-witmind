import Link from "next/link";
import { ArrowRight, ClipboardList, FileSearch, Timer } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Postula a una convocatoria",
    body: "Revisa las vacantes abiertas, lee el perfil y postula con tu cuenta. El proceso toma menos de un minuto.",
  },
  {
    icon: Timer,
    title: "Rinde tu evaluación",
    body: "Cada convocatoria tiene una batería de pruebas que se rinden en orden. Puedes hacer una pausa entre pruebas, pero no dentro de una.",
  },
  {
    icon: FileSearch,
    title: "El equipo revisa tu resultado",
    body: "Tus respuestas se califican automáticamente y el equipo de selección revisa tu perfil completo.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-2xl font-heading text-3xl leading-tight font-medium text-balance sm:text-4xl">
            Evaluaciones de selección que miden lo que el puesto realmente exige
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Postula a una convocatoria y rinde una batería breve de pruebas en línea. Sin papel,
            sin traslados y con resultados el mismo día.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button size="lg" render={<Link href="/convocatorias" />}>
              Ver convocatorias
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/registro" />}>
              Crear cuenta
            </Button>
          </div>

          {count !== null && count > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {count === 1 ? "Hay 1 convocatoria abierta" : `Hay ${count} convocatorias abiertas`}{" "}
              en este momento.
            </p>
          )}
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-5 text-muted-foreground" />
                <CardTitle>
                  {i + 1}. {title}
                </CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-6">
        <div className="mx-auto w-full max-w-5xl px-4 text-sm text-muted-foreground">
          Evalua — plataforma de evaluación para procesos de selección.
        </div>
      </footer>
    </>
  );
}
