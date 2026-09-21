import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemBank, type AdminItem, type Subscale } from "@/components/admin/item-bank";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Preguntas de la prueba" };

export default async function AdminTestDetailPage({ params }: PageProps<"/admin/tests/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: test } = await supabase
    .from("tests")
    .select("id, name, description, source, scoring_strategy, test_subscales(id, code, name, display_order)")
    .eq("id", id)
    .maybeSingle();

  if (!test) notFound();

  const { data, error } = await supabase.rpc("admin_get_test_items", { p_test_id: id });
  if (error) notFound();

  const items = (data ?? []) as unknown as AdminItem[];
  const subscales = [
    ...((test.test_subscales ?? []) as unknown as Subscale[]),
  ].sort((a, b) => a.display_order - b.display_order);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link href="/admin/tests" className="text-sm text-muted-foreground hover:underline">
        ← Volver al banco de pruebas
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-medium">{test.name}</h1>
      <p className="mt-1 text-muted-foreground">{test.description}</p>

      {test.source === "seed_licensed" && (
        <Alert className="mt-6">
          <AlertTitle>Instrumento de terceros</AlertTitle>
          <AlertDescription>
            Esta prueba proviene de un instrumento con autoría externa. Verifica que cuentas con la
            licencia correspondiente antes de usarla en un proceso real. Puedes desactivarla o
            eliminarla sin afectar al resto de la plataforma.
          </AlertDescription>
        </Alert>
      )}

      <ItemBank
        testId={test.id}
        strategy={test.scoring_strategy}
        subscales={subscales}
        items={items}
      />
    </main>
  );
}
