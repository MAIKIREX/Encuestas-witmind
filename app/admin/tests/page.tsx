import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Banco de pruebas · Administración" };

const STRATEGY_LABEL: Record<string, string> = {
  key_sum: "Opción múltiple con clave",
  key_sum_subscale: "Opción múltiple con subescalas",
  likert_reverse: "Escala Likert con ítems inversos",
  sjt_weighted: "Juicio situacional con puntuación parcial",
  ipsative: "Elección forzada",
};

export default async function AdminTestsPage() {
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select(
      "id, slug, name, description, source, scoring_strategy, time_limit_seconds, is_active, test_items(count), assessment_tests(assessments(name))",
    )
    .order("name");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="font-heading text-2xl font-medium">Banco de pruebas</h1>
      <p className="mt-1 text-muted-foreground">
        Cada prueba es un conjunto de preguntas con su propia forma de calificar. Las claves de
        respuesta se guardan fuera del alcance de la API pública.
      </p>

      <div className="mt-8 grid gap-3">
        {tests?.map((test) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const itemCount = (test.test_items as any)?.[0]?.count ?? 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const usedIn = ((test.assessment_tests as any) ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((at: any) => at.assessments?.name)
            .filter(Boolean);

          return (
            <Card key={test.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {test.name}
                  {test.source === "seed_licensed" && (
                    <Badge variant="outline">Instrumento externo</Badge>
                  )}
                  {!test.is_active && <Badge variant="destructive">Inactiva</Badge>}
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {itemCount} ítems · {formatMinutes(test.time_limit_seconds)}
                  </span>
                </CardTitle>
                <CardDescription>{test.description}</CardDescription>
                <p className="mt-2 text-xs text-muted-foreground">
                  {STRATEGY_LABEL[test.scoring_strategy] ?? test.scoring_strategy}
                  {usedIn.length > 0 && ` · Se usa en: ${usedIn.join(", ")}`}
                </p>
              </CardHeader>

              <div className="px-(--card-spacing)">
                <Button size="sm" variant="outline" render={<Link href={`/admin/tests/${test.id}`} />}>
                  Ver y editar preguntas
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
