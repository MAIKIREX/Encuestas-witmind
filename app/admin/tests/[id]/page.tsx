import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";

import { signAdminMediaPaths } from "@/app/actions/media";
import { ItemBank, type AdminItem, type Subscale } from "@/components/admin/item-bank";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Preguntas de la prueba · Administración" };

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

  // Firmar de una sola vez todas las imagenes del banco (en vez de que cada
  // miniatura pida su propia URL): con pruebas de imagen como Raven son
  // cientos de miniaturas y eso era lo que hacia lenta esta pantalla.
  const mediaPaths = items.flatMap((item) => [
    item.media_url,
    ...item.options.map((o) => o.media_url),
  ]).filter((p): p is string => Boolean(p));
  const mediaUrls = await signAdminMediaPaths(mediaPaths);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Botón de retroceso y Kicker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href="/admin/tests"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-md text-xs font-semibold text-[#d9a771] hover:bg-black/60 hover:text-white transition-all w-fit mb-3"
          >
            <ArrowLeft className="size-3.5" />
            Volver al banco de pruebas
          </Link>

          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {test.name}
          </h1>
          <div className="mt-2.5 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#ba5e30] to-[#d9a771]" />
          {test.description && (
            <p className="mt-3 text-sm sm:text-base text-[#e5d8cc] max-w-3xl leading-relaxed">
              {test.description}
            </p>
          )}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-xs text-xs sm:text-sm text-[#d9a771] w-fit shadow-md shrink-0">
          <Sparkles className="size-4 text-[#d9a771]" />
          <span>
            {items.length} {items.length === 1 ? "reactivo configurado" : "reactivos configurados"}
          </span>
        </div>
      </div>

      {test.source === "seed_licensed" && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3.5 backdrop-blur-xs">
          <ShieldAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#f5ebd7] leading-relaxed">
            <strong className="text-amber-200 block font-semibold mb-0.5">Instrumento de terceros</strong>
            Esta prueba proviene de un instrumento con autoría externa. Verifica que cuentas con la
            licencia correspondiente antes de usarla en un proceso real. Puedes desactivarla o
            eliminarla sin afectar al resto de la plataforma.
          </div>
        </div>
      )}

      <ItemBank
        testId={test.id}
        strategy={test.scoring_strategy}
        subscales={subscales}
        items={items}
        mediaUrls={mediaUrls}
      />
    </main>
  );
}
