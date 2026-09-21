import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";
import type { Database } from "../lib/supabase/types";

// `test_items` no se expone aun en los tipos generados de la aplicacion (ver
// scripts/import-raven.ts), pero existe en la base de datos y es necesario
// para que el proceso sea reanudable (upsert por stem en vez de duplicar).
type WonderlicDatabase = Database & {
  public: Database["public"] & {
    Tables: Database["public"]["Tables"] & {
      test_items: {
        Row: { id: string; test_id: string; stem: string };
        Insert: { id?: string; test_id: string; stem: string };
        Update: Partial<{ id: string; test_id: string; stem: string }>;
        Relationships: [];
      };
    };
  };
};
type ServiceClient = SupabaseClient<WonderlicDatabase>;

// Digitalizacion del Wonderlic — Examen para el Personal, Formulario A, a
// partir de docuemntacion/180. Wonderlick - Guia para examen del personal.
// Los items 7, 38, 42 y 49 dependen de un diagrama geometrico del cuadernillo
// (figuras a formar / lineas a trazar entre numeros) que no se digitalizo
// todavia: se omiten aqui y quedan pendientes de una segunda pasada una vez
// que existan las laminas recortadas (ver test-media, mismo patron que
// scripts/import-raven.ts).
//
// Items marcados MARCADOR EXTRA abajo tienen una lectura ambigua del
// cuadernillo escaneado (numero faltante, doble numeracion o clave
// manuscrita poco clara) y quedan con la mejor interpretacion posible:
// revisar contra el cuadernillo fisico antes de activar la prueba.
//   - 8: la serie impresa parece cortada en el escaneo; se infirio el sexto
//     termino (1/4) a partir de la clave (1/8).
//   - 27: la clave "3 o 1/3" se interpreto como 3+1/3 (centavos), no como dos
//     respuestas alternativas independientes.
//   - 36: al numero de partidos perdidos le falta un digito en el escaneo;
//     se infirio "9" porque 9/(3/8) = 24, que coincide con la clave.
//   - 41: la numeracion de los refranes esta duplicada en el escaneo
//     (aparecen dos "3."); se conservo el orden impreso tal cual.

type AnswerKey = { accepted: string[]; points?: number };
type DraftOption = { code: string; label: string; is_correct: boolean };

type WonderlicItem =
  | { code: number; stem: string; kind: "mcq"; options: string[]; correctIndex: number }
  | { code: number; stem: string; kind: "free"; accepted: string[] };

const TEST_SLUG = "wonderlic-formulario-a";
const TEST_NAME = "Wonderlic — Examen para el Personal (Formulario A)";
const SIMILAR_OPTIONS = ["similar", "contradictorio", "ni similar ni contradictorio"];
const VFD_OPTIONS = ["verdadero", "falso", "dudoso"];

const ITEMS: WonderlicItem[] = [
  { code: 1, kind: "mcq", stem: "El último mes del año es:", options: ["enero", "marzo", "julio", "diciembre", "octubre"], correctIndex: 3 },
  { code: 2, kind: "mcq", stem: "CAPTURAR es lo contrario de:", options: ["lugar", "soltar", "riesgo", "aventura", "degradar"], correctIndex: 1 },
  { code: 3, kind: "mcq", stem: "La mayor parte de las palabras que siguen son parecidas. ¿Cuál es la que no tiene relación con las otras?", options: ["enero", "agosto", "miércoles", "octubre", "diciembre"], correctIndex: 2 },
  { code: 4, kind: "mcq", stem: 'Conteste SI o NO: R.S.V.P. ¿Significa "no se requiere una respuesta"?', options: ["SI", "NO"], correctIndex: 1 },
  { code: 5, kind: "mcq", stem: "En el siguiente conjunto de palabras, ¿qué palabra es diferente de las otras?", options: ["tropa", "grupo", "participar", "jauría", "cuadrilla"], correctIndex: 2 },
  { code: 6, kind: "mcq", stem: "USUAL es lo contrario de:", options: ["raro", "habitual", "regular", "constante", "simple"], correctIndex: 0 },
  { code: 8, kind: "free", stem: "Fíjese en la progresión de números a continuación. ¿Qué número debe seguir? 8, 4, 2, 1, 1/2, 1/4, …", accepted: ["1/8", "0.125", "0,125"] },
  { code: 9, kind: "mcq", stem: "CLIENTE – CONSUMIDOR. Estas palabras tienen significado:", options: SIMILAR_OPTIONS, correctIndex: 0 },
  { code: 10, kind: "mcq", stem: "¿Cuál de estas palabras se relaciona con la acción de oler, como los dientes se relacionan con la acción de masticar?", options: ["dulce", "hediondez", "olor", "nariz", "limpio"], correctIndex: 3 },
  { code: 11, kind: "mcq", stem: "OTOÑO es lo contrario de:", options: ["vacación", "verano", "primavera", "invierno", "nieve"], correctIndex: 2 },
  { code: 12, kind: "free", stem: "Un tren recorre 300 pies en 1/2 segundo. A la misma velocidad, ¿cuántos pies recorrerá en 10 segundos?", accepted: ["6000"] },
  { code: 13, kind: "mcq", stem: "Suponga que los dos primeros enunciados son verdaderos. Es el último de ellos: Estos muchachos son niños normales. Todos los niños normales son activos. Estos muchachos son activos.", options: VFD_OPTIONS, correctIndex: 0 },
  { code: 14, kind: "mcq", stem: "REMOTO es lo contrario de:", options: ["recluido", "cercano", "lejano", "apresurado", "exacto"], correctIndex: 1 },
  { code: 15, kind: "free", stem: "Los dulces de limón se venden a 3 por 10 centavos. ¿Cuánto costarán 1 y 1/2 docena?", accepted: ["60", "60c", "60¢", "$0.60", "0.60", "0,60"] },
  { code: 16, kind: "free", stem: "¿Cuántas de las cantidades enumeradas abajo son idénticas entre sí? 84721/84721 · 9210651/9210561 · 14201201/14210210 · 96101101/96101161 · 88884444/88884444", accepted: ["2"] },
  { code: 17, kind: "free", stem: "Suponga que usted ordena las siguientes palabras de tal manera que formen un enunciado verdadero; luego escriba la última letra de la última palabra, como la respuesta a este problema: Una verbo oración un tiene siempre.", accepted: ["o", "0"] },
  { code: 18, kind: "free", stem: "Un muchacho tiene 5 años y su hermana el doble. Cuando el niño tenga 8 años, ¿qué edad tendrá la hermana?", accepted: ["13"] },
  { code: 19, kind: "mcq", stem: "ESTA – ESTÁ. Estas palabras tienen significado:", options: SIMILAR_OPTIONS, correctIndex: 2 },
  { code: 20, kind: "mcq", stem: "Suponga que los dos primeros enunciados son verdaderos. Es el último enunciado: Juan tiene la misma edad que Patricia. Patricia es más joven que Pepe. Juan es más joven que Pepe.", options: VFD_OPTIONS, correctIndex: 0 },
  { code: 21, kind: "free", stem: "Un agente de negocios compró unos barriles por $4,000. Los vendió por $5,000, ganando $50 en cada uno. ¿Cuántos barriles había comprado?", accepted: ["20"] },
  { code: 22, kind: "free", stem: 'Supongamos que usted ordena las siguientes palabras de tal manera que formen una frase completa: huevos ponen Todas las gallinas. Si el enunciado resultante es verdadero escriba "V"; si es falso, escriba "F".', accepted: ["v", "verdadero"] },
  {
    code: 23,
    kind: "free",
    stem:
      "Dos de los siguientes refranes tienen el mismo significado. ¿Cuáles son? " +
      "1. Dime con quién andas y te diré quién eres. 2. Hijo de tigre sale pintado. " +
      "3. Perro que ladra no muerde. 4. En casa de herrero cuchillo de palo. 5. De tal palo tal astilla.",
    accepted: pairVariants(2, 5),
  },
  { code: 24, kind: "free", stem: "Un reloj se atrasó un minuto y 18 segundos en 39 días. ¿Cuántos segundos se atrasó en cada día?", accepted: ["2"] },
  { code: 25, kind: "mcq", stem: "TAZA – TASA. Estas palabras tienen significado:", options: SIMILAR_OPTIONS, correctIndex: 2 },
  { code: 26, kind: "mcq", stem: "Suponga que los dos primeros enunciados son verdaderos. Es el último de ellos: Todos los cuáqueros son pacifistas. Algunas de las personas de este cuarto son cuáqueros. Algunas de las personas en este cuarto son pacifistas.", options: VFD_OPTIONS, correctIndex: 0 },
  { code: 27, kind: "free", stem: "En 30 días un muchacho ahorró $1.00. ¿Cuál fue su ahorro promedio diario?", accepted: ["3 1/3", "3.33", "3,33", "31/3", "10/3"] },
  { code: 28, kind: "mcq", stem: "INGENIOSO – INGENIO. Estas palabras tienen significado:", options: SIMILAR_OPTIONS, correctIndex: 2 },
  { code: 29, kind: "free", stem: "Dos hombres pescaron 36 pescados; X pescó 5 veces más que Y. ¿Cuántos pescados pescó Y?", accepted: ["6"] },
  { code: 30, kind: "free", stem: "Un recipiente rectangular, completamente lleno, contiene 800 pies cúbicos de granos. Si el recipiente tiene 8 pies de ancho y 10 de largo, ¿cuál es la altura del recipiente?", accepted: ["10"] },
  { code: 31, kind: "free", stem: "Uno de los números de la serie siguiente no está de acuerdo con la progresión de los demás. ¿Cuál debería ser ese número? 1/2, 1/4, 1/6, 1/8, 1/9, 1/12", accepted: ["1/9", "0.111", "0,111"] },
  { code: 32, kind: "mcq", stem: 'Conteste esta pregunta SI o NO. ¿Significa A.C. "Antes de Cristo"?', options: ["SI", "NO"], correctIndex: 0 },
  { code: 33, kind: "mcq", stem: "COSER – COCER. Estas palabras tienen significado:", options: ["similares", "contradictorios", "ni similar ni contradictorio"], correctIndex: 2 },
  { code: 34, kind: "free", stem: "Una falda requiere 2 1/4 yardas de tela. ¿Cuántas faldas se pueden cortar de una pieza de tela de 45 yardas?", accepted: ["20"] },
  { code: 35, kind: "free", stem: "Un reloj tenía la hora precisa al mediodía del lunes. A las 2 de la tarde del miércoles, se atrasaba 25 segundos. Al mismo ritmo, ¿cuántos segundos se atrasaría en 1/2 hora?", accepted: ["14"] },
  { code: 36, kind: "free", stem: "Nuestro equipo de béisbol perdió 9 partidos esta temporada, lo que representa 3/8 del total de partidos jugados. ¿Cuántos partidos jugaron esta temporada?", accepted: ["24"] },
  { code: 37, kind: "free", stem: "¿Cuál es el siguiente número en esta serie? 1, 0.5, 0.25, 0.125, …", accepted: ["0.0625", "0,0625", "1/16"] },
  { code: 39, kind: "mcq", stem: "Son los significados de las siguientes oraciones: Una escoba nueva limpia bien. Los zapatos viejos son más cómodos.", options: ["similares", "contradictorias", "ni similares ni contradictorias"], correctIndex: 1 },
  {
    code: 40,
    kind: "free",
    stem:
      "¿Cuántos de los cinco pares de nombres escritos abajo son idénticos entre sí? " +
      "Maribella J.D. / Maribella J.D. · Hernández M.O. / Hernández M.O. · Santos W.E. / Santo W.E. · " +
      "Sessael A.B. / Sesseal A.B. · López A.O. / López A.O.",
    accepted: ["1"],
  },
  {
    code: 41,
    kind: "free",
    stem:
      "Dos de los siguientes refranes tienen significados similares. ¿Cuáles son? " +
      "1. El que está en el lodo quería meter al otro. 2. Más vale tarde que nunca. " +
      "3. Con la vara que midas serás medido. 4. Mal de muchos consuelo de tontos. 5. Perro que ladra no muerde.",
    accepted: pairVariants(1, 4),
  },
  { code: 43, kind: "free", stem: "¿Cuál de los números en el siguiente grupo representa la cantidad más pequeña? 10, 1, 0.999, 0.33, 11", accepted: ["0.33", "0,33", "0.3", "0,3"] },
  { code: 44, kind: "mcq", stem: "Son los significados de las siguientes oraciones: Nadie se arrepintió jamás de su honestidad. La honestidad se elogia pero no se pega.", options: ["similares", "contradictorios", "ni similar ni contradictorio"], correctIndex: 1 },
  { code: 45, kind: "free", stem: "Por $1.80 un tendero compra un cajón de naranjas de 12 docenas. Sabe que 2 docenas se pudrirán antes que él pueda venderlas. ¿A cómo debe vender la docena de lo que queda para ganar 1/3 sobre el costo total?", accepted: ["24", "0.24", "$0.24", "0,24"] },
  { code: 46, kind: "mcq", stem: "En el siguiente grupo de palabras, ¿cuál de ellas es diferente de las otras?", options: ["colonia", "compañera", "pollada", "tripulación", "constelación"], correctIndex: 1 },
  { code: 47, kind: "mcq", stem: "Suponga que los dos primeros enunciados son verdaderos. Es el último de ellos: Los genios son ridiculizados. Yo soy ridiculizado. Yo soy un genio.", options: VFD_OPTIONS, correctIndex: 2 },
  { code: 48, kind: "free", stem: "Tres hombres forman una sociedad y se ponen de acuerdo para repartir las ganancias en proporción a la cantidad invertida. X invierte $4,500, Y invierte $3,500 y Z invierte $2,000. Si las ganancias fuesen $1,500, ¿cuánto más recibiría X que Z?", accepted: ["175"] },
  { code: 50, kind: "free", stem: "Al imprimir un artículo de 30,000 palabras, un impresor desea usar dos tamaños de tipo. Al usar el tipo más grande, una página impresa contiene 1,200 palabras. Al usar el tipo más pequeño, una página contiene 1,500 palabras. Se le permiten al artículo 22 páginas. ¿Cuántas páginas deben ser impresas en el tipo pequeño?", accepted: ["20"] },
];

const SKIPPED_CODES = [7, 38, 42, 49];

function pairVariants(a: number, b: number): string[] {
  return [`${a},${b}`, `${b},${a}`, `${a};${b}`, `${b};${a}`, `${a} ${b}`, `${b} ${a}`, `${a}${b}`, `${b}${a}`];
}

const CODES = ["a", "b", "c", "d", "e", "f", "g", "h"];

async function getOrCreateTest(db: ServiceClient) {
  const { data: existing, error: searchError } = await db
    .from("tests")
    .select("id, scoring_strategy, source")
    .eq("slug", TEST_SLUG)
    .maybeSingle();
  if (searchError) throw new Error(`No se pudo buscar la prueba: ${searchError.message}`);
  if (existing) {
    if (existing.scoring_strategy !== "key_sum" || existing.source !== "seed_licensed") {
      throw new Error(`Ya existe ${TEST_SLUG}, pero su configuración no corresponde al importador.`);
    }
    return existing.id as string;
  }

  const { data: created, error: createError } = await db
    .from("tests")
    .insert({
      slug: TEST_SLUG,
      name: TEST_NAME,
      description: "Prueba de habilidad cognitiva general (razonamiento verbal, numérico y espacial), 50 ítems.",
      instructions:
        "Contesta cuantas preguntas puedas en el tiempo asignado. Las preguntas son progresivamente más difíciles: no te saltes ninguna. Escribe únicamente la respuesta pedida.",
      source: "seed_licensed",
      scoring_strategy: "key_sum",
      scoring_config: {},
      is_timed: true,
      time_limit_seconds: 720,
      shuffle_items: false,
      shuffle_options: false,
      is_active: false,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(`No se pudo crear la prueba: ${createError?.message ?? "sin respuesta"}`);
  return created.id as string;
}

async function main() {
  loadEnvConfig(process.cwd());

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  const db = createClient<WonderlicDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testId = await getOrCreateTest(db);

  const { data: savedItems, error: savedItemsError } = await db
    .from("test_items")
    .select("id, stem")
    .eq("test_id", testId);
  if (savedItemsError) throw new Error(`No se pudieron consultar los ítems existentes: ${savedItemsError.message}`);
  const itemIdByStem = new Map((savedItems ?? []).map((item) => [item.stem, item.id]));

  let completed = 0;
  const failures: string[] = [];

  for (const item of ITEMS) {
    const stem = `${item.code}. ${item.stem}`;
    try {
      if (item.kind === "mcq") {
        const options: DraftOption[] = item.options.map((label, i) => ({
          code: CODES[i],
          label,
          is_correct: i === item.correctIndex,
        }));
        const { error } = await db.rpc("admin_upsert_item", {
          p_test_id: testId,
          p_item_id: itemIdByStem.get(stem) ?? null,
          p_stem: stem,
          p_item_type: "mcq_single",
          p_subscale_id: null,
          p_is_reverse: false,
          p_media_url: null,
          p_answer_key: null,
          p_options: options.map((o, i) => ({
            code: o.code,
            label: o.label,
            display_order: i + 1,
            is_correct: o.is_correct,
            points: o.is_correct ? 1 : 0,
          })),
        });
        if (error) throw new Error(error.message);
      } else {
        const answerKey: AnswerKey = { accepted: item.accepted, points: 1 };
        const { error } = await db.rpc("admin_upsert_item", {
          p_test_id: testId,
          p_item_id: itemIdByStem.get(stem) ?? null,
          p_stem: stem,
          p_item_type: "free_response",
          p_subscale_id: null,
          p_is_reverse: false,
          p_media_url: null,
          p_options: [],
          p_answer_key: answerKey,
        });
        if (error) throw new Error(error.message);
      }
      completed += 1;
      console.log(`✓ ${item.code}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.code}: ${message}`);
      console.error(`✗ ${item.code}: ${message}`);
    }
  }

  console.log(
    `\nResumen: ${completed}/${ITEMS.length} ítems importados; ${failures.length} con error. ` +
      `Pendientes por diagrama (no incluidos): ${SKIPPED_CODES.join(", ")}.`,
  );
  console.log("La prueba quedó inactiva (is_active = false): revisa las claves antes de activarla.");
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Importación cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
