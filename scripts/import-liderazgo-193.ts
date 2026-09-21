import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";
import type { Database } from "../lib/supabase/types";

// Digitalizacion del "Test Perfil y Estilos de Liderazgo" a partir de
// docuemntacion/193. Test Perfil y Estilos de Liderazgo/Test Perfil y
// Estilos de Liderazgo.xls.
//
// Formato: 36 items de eleccion forzada de 2 frases (A/B). El candidato
// marca la frase con la que MAS está de acuerdo; no hay marca "least" (a
// diferencia de PPG-IPG, cada item aqui es un par, no una tetrada). Cada
// frase pertenece a exactamente uno de los 6 estilos de liderazgo del
// cuadernillo original.
//
// La clave item->estilo se extrajo de las formulas de la propia planilla
// (columnas O:T, filas 210:222, cada una del tipo IF(<col><fila>="X",1,0)
// que referencia la celda donde se marcaria una "X" para esa frase) en vez
// de adivinarse por contenido: leida con SheetJS (xlsx) preservando
// `cellFormula`, se resolvio cada referencia de celda al item/frase (top o
// bottom) que ocupa esa fila y se mapeo la columna fija de la formula
// (F=CAPATAZ, G=GUIA, H=AUTORITARIO, I=AFILIADOR, J=DEMOCRATA, K=COACH) al
// codigo de subescala correspondiente. En 6 de los 36 items (6, 7, 13, 15,
// 16 y 32) las dos frases del par apuntan al MISMO estilo segun la propia
// planilla original: se conserva tal cual, es el diseño del cuadernillo, no
// un error de transcripcion.
//
// Como nunca se puebla la marca "least" en scoring.forced_choice_scores, el
// max_score por subescala que calcula scoring.score_attempt (pensado para
// tetradas most+least de PPG-IPG) queda el doble del techo real alcanzable;
// el orden relativo entre subescalas (y por lo tanto el estilo dominante)
// no se ve afectado, solo el "% del maximo" que se muestra en el desglose
// admin se ve partido a la mitad.

type Style = "CAPATAZ" | "GUIA" | "AUTORITARIO" | "AFILIADOR" | "DEMOCRATA" | "COACH";

const TEST_SLUG = "perfil-estilos-liderazgo";
const TEST_NAME = "Test Perfil y Estilos de Liderazgo";

const SUBSCALES: { code: Style; name: string; description: string }[] = [
  { code: "CAPATAZ", name: "El Capataz", description: "Énfasis en la producción y el cumplimiento de estándares por sobre la relación con el equipo." },
  { code: "GUIA", name: "El Guía", description: "Orienta y motiva confiando en que cada persona alcance las metas por sí misma." },
  { code: "AUTORITARIO", name: "El Autoritario", description: "Toma las decisiones y espera que los subordinados las acepten y las sigan." },
  { code: "AFILIADOR", name: "El Afiliador", description: "Prioriza el clima y las relaciones personales del equipo por sobre la producción." },
  { code: "DEMOCRATA", name: "El Demócrata", description: "Involucra a los subordinados en las decisiones y valora sus ideas y su autonomía." },
  { code: "COACH", name: "El Coach", description: "Desarrolla a los subordinados, estimulando su reflexión y su mejora continua." },
];

const ITEMS: { code: number; top: { text: string; style: Style }; bottom: { text: string; style: Style } }[] = [
  { code: 1, top: { text: "Yo creo que una vez que las metas han sido fijadas, cada persona debe tener la suficiente motivación para alcanzarlo.", style: "GUIA" }, bottom: { text: "Yo doy a mis subordinados toda la libertad posible, pero si su producción no es la que yo espero, entonces les limito su libertad.", style: "AFILIADOR" } },
  { code: 2, top: { text: "Yo les digo a mis subordinados que no se preocupen por la producción de otros y que más bien se concentren en su propia mejoría.", style: "COACH" }, bottom: { text: "Yo no creo que los reportes escritos sean muy necesarios en las situaciones donde la confianza ha sido establecida.", style: "DEMOCRATA" } },
  { code: 3, top: { text: "Yo no tengo standares altos pero me molesta y tengo poca simpatía con la gente que no puede alcanzarlos.", style: "GUIA" }, bottom: { text: "Cuando el plan de un subordinado no es apropiado, yo lo estimulo para que lo piense de nuevo y rehaga su plan.", style: "COACH" } },
  { code: 4, top: { text: "Yo creo que los valores y derechos humanos son más importantes que el trabajo inmediato.", style: "AFILIADOR" }, bottom: { text: "Yo recompenso a un buen trabajador y pienso que el castigo por baja producción debe tener un uso limitado.", style: "DEMOCRATA" } },
  { code: 5, top: { text: "Generalmente yo sugiero a mis subordinados las alternativas que existen y dejo que ellos decidan en vez de decidirles la forma que yo prefiero que hagan las cosas.", style: "COACH" }, bottom: { text: "Yo creo que mis subordinados deben encontrar la mejor forma de resolver sus problemas y alcanzar el éxito por si solos.", style: "GUIA" } },
  { code: 6, top: { text: "Cuando las alternativas de acción me han sido definidas, me resulta muy difícil expresar cual es la acción que yo prefiero.", style: "AUTORITARIO" }, bottom: { text: "Cuando un subordinado no esta de acuerdo conmigo, tengo el cuidado de darles mis razones explicándole porque quiero que se haga las cosas de cierta manera.", style: "AUTORITARIO" } },
  { code: 7, top: { text: "Yo creo que el disciplinar a los empleados hacen más mal que bien.", style: "AFILIADOR" }, bottom: { text: "Yo creo que es bueno desarrollar relaciones personales con mis subordinados porque creo que esto distingue al buen administrador.", style: "AFILIADOR" } },
  { code: 8, top: { text: "Yo recompenso a un buen trabajador y pienso que el castigo por baja producción debe tener un uso limitado.", style: "DEMOCRATA" }, bottom: { text: "Cuando un subordinado falla en su producción, yo le hago conocer su falla en forma razonable.", style: "AUTORITARIO" } },
  { code: 9, top: { text: "Yo espero que mis subordinados lleven a cabo los planes que yo he preparado.", style: "CAPATAZ" }, bottom: { text: "Yo creo que mis subordinados deben resolver sus problemas y lograr el éxito por si solos.", style: "GUIA" } },
  { code: 10, top: { text: "Cuando yo tomo una decisión, yo también tomo todos los pasos necesarios para persuadir a mis subordinados que la acepten.", style: "AUTORITARIO" }, bottom: { text: "En general, yo creo que los planes que se hagan deben representar las ideas de mis subordinados.", style: "DEMOCRATA" } },
  { code: 11, top: { text: "Yo creo que la gente se desarrolla mejor en un ambiente de confianza.", style: "DEMOCRATA" }, bottom: { text: "Yo creo que una vez que las metas han sido fijadas, cada hombre debe tener la motivación suficiente para alcanzarlas.", style: "GUIA" } },
  { code: 12, top: { text: "Cuando yo disciplino a un subordinado, yo le hago saber en forma muy clara lo que ha hecho mal.", style: "CAPATAZ" }, bottom: { text: "Yo no creo que los reportes escritos sean muy necesarios en las situaciones donde la confianza ha sido establecida.", style: "DEMOCRATA" } },
  { code: 13, top: { text: "Yo creo la disciplina firme es muy importante para mantener la producción continua.", style: "CAPATAZ" }, bottom: { text: "Yo insisto a mis subordinados para que entreguen reportes detallados de sus actividades.", style: "CAPATAZ" } },
  { code: 14, top: { text: "Yo creo que un líder popular es mejor que uno impopular.", style: "AFILIADOR" }, bottom: { text: "Yo creo que mis subordinados no deben desalentarse por los problemas que surgen en el trabajo y que además deben resolverlos por si mismos.", style: "GUIA" } },
  { code: 15, top: { text: "Yo creo que el trabajo de todo administrador debe ser, de desarrollar la voluntad de mejorar en sus subordinados.", style: "COACH" }, bottom: { text: "Yo me preocupo constantemente de tener standars de producción altos y trato de alentar a mis subordinados para que los alcancen.", style: "COACH" } },
  { code: 16, top: { text: "Yo estoy disponible como consultor y consejero de mis subordinados cuando hemos acordado que ellos necesitan mi ayuda.", style: "DEMOCRATA" }, bottom: { text: "Yo creo que la gente se desarrolla mejor en un ambiente de confianza.", style: "DEMOCRATA" } },
  { code: 17, top: { text: "Cuando el plan de un subordinado no es apropiado, yo lo estimulo para que lo piense de nuevo y rehaga su plan.", style: "COACH" }, bottom: { text: "Frecuentemente yo doy ordenes en forma de sugerencia pero lo hago de tal manera que quede claro lo que yo deseo.", style: "AUTORITARIO" } },
  { code: 18, top: { text: "Yo creo que la seguridad en el trabajo y las prestaciones son muy importante para la satisfacción del personal.", style: "AFILIADOR" }, bottom: { text: "Cuando el plan de un subordinado no es apropiado, yo lo estimulo para que lo piense de nuevo y rehaga su plan.", style: "COACH" } },
  { code: 19, top: { text: "A la larga, despediré a un trabajador si yo considero que no es manejable.", style: "CAPATAZ" }, bottom: { text: "Yo trato de anular los argumentos que alteren la armonía entre los subordinados.", style: "AFILIADOR" } },
  { code: 20, top: { text: "Yo no creo que los reportes escritos sean muy necesarios en las situaciones donde la confianza se ha establecido.", style: "DEMOCRATA" }, bottom: { text: "Yo espero que mis subordinados lleven a cabo los planes que yo he preparado.", style: "CAPATAZ" } },
  { code: 21, top: { text: "Yo no me preocupo tanto por establecer relaciones personales con mis subordinados como de lograr que sigan mi ejemplo.", style: "GUIA" }, bottom: { text: "Yo creo que los valores y los derechos humanos son más importantes que el trabajo inmediato.", style: "AFILIADOR" } },
  { code: 22, top: { text: "Yo me fijo en el mejor desempeño de cada individuo, en vez de insistir en un nivel alto de producción.", style: "COACH" }, bottom: { text: "Yo trato de anular los argumentos que pueden alterar la armonía entre mis subordinados.", style: "AFILIADOR" } },
  { code: 23, top: { text: "Yo creo que mis subordinados no deben desalentarse por los problemas que surgen en el trabajo y que más bien deben resolverlos por si mismos.", style: "GUIA" }, bottom: { text: "Cuando yo tomo una decisión, yo también tomo todos los pasos necesarios para persuadir a mis subordinados que la acepten.", style: "AUTORITARIO" } },
  { code: 24, top: { text: "Cuando un subordinado no esta de acuerdo conmigo, tengo el cuidado de darle mis razones explicándole porque quiero que se hagan las cosas de cierta manera.", style: "AUTORITARIO" }, bottom: { text: "Yo creo que el disciplinar a los empleados hace más mal que bien.", style: "AFILIADOR" } },
  { code: 25, top: { text: "Yo me preocupo constantemente de tener standard de producción altos, y trato de alentar a mis subordinados para que los alcancen.", style: "COACH" }, bottom: { text: "Yo creo que la disciplina firme es muy importante para mantener la producción continua.", style: "CAPATAZ" } },
  { code: 26, top: { text: "Yo trato de anular argumentos que puedan alterar la armonía entre mis subordinados.", style: "AFILIADOR" }, bottom: { text: "Yo espero que mis subordinados sigan mis instrucciones cuidadosamente.", style: "CAPATAZ" } },
  { code: 27, top: { text: "Yo creo que es bueno desarrollar las relaciones personales con mis subordinados, porque creo que esto distingue al buen administrador.", style: "AFILIADOR" }, bottom: { text: "Cuando las alternativas de acción me han sido definidas, me resulta muy fácil expresar cual es la acción que yo prefiero.", style: "AUTORITARIO" } },
  { code: 28, top: { text: "Cuando un subordinado falla en su producción, yo le hago conocer su falla en forma razonable.", style: "AUTORITARIO" }, bottom: { text: "Yo no me preocupo tanto por establecer relaciones personales con mis subordinados como de lograr que sigan mi ejemplo.", style: "GUIA" } },
  { code: 29, top: { text: "Yo espero que mis subordinados sigan mis instrucciones cuidadosamente.", style: "CAPATAZ" }, bottom: { text: "Frecuentemente yo doy ordenes en forma de sugerencia, pero lo hago de tal forma que quede claro lo que yo deseo.", style: "AUTORITARIO" } },
  { code: 30, top: { text: "Yo doy a mis subordinados toda la libertad posible pero si su producción no es la que yo espero, entonces les limito el tiempo.", style: "GUIA" }, bottom: { text: "Yo espero disponibilidad como consultor y consejero de mis subordinados cuando hemos acordado que ellos necesitan mi ayuda.", style: "DEMOCRATA" } },
  { code: 31, top: { text: "Yo creo que mis subordinados no deben desalentarse por los problemas que surgen en el trabajo y que más bien deben resolverlos por si mismos.", style: "GUIA" }, bottom: { text: "Cuando yo disciplino a mis subordinados yo le hago saber en forma clara lo que ha hecho mal.", style: "CAPATAZ" } },
  { code: 32, top: { text: "Yo tiendo a apoyarme en las ideas de mis subordinados y en que pueden autodirigirse y autocontrolarse, en vez de controlarlos yo mismo.", style: "DEMOCRATA" }, bottom: { text: "Generalmente yo sugiero a mis subordinados las alternativas que existen y dejo que ellos decidan en vez de decidirles la forma que yo prefiero que se hagan las cosas.", style: "DEMOCRATA" } },
  { code: 33, top: { text: "Yo trato de reducir la resistencia de mis subordinados a una decisión mía, haciéndoles notar como van a beneficiarse o ganar con mi decisión.", style: "GUIA" }, bottom: { text: "Yo me fijo en el mejor desempeño de cada individuo en vez de insistir en un nivel alto en producción.", style: "COACH" } },
  { code: 34, top: { text: "Frecuentemente yo doy ordenes en forma de sugerencia, pero lo hago de tal forma que quede claro lo que yo deseo.", style: "AUTORITARIO" }, bottom: { text: "A la larga, despediré a un trabajador si considero que no es manejable.", style: "CAPATAZ" } },
  { code: 35, top: { text: "Yo insisto en que mis subordinados entreguen reportes detallados de sus actividades.", style: "CAPATAZ" }, bottom: { text: "Yo me preocupo constantemente de tener estándar de producción alto y trato de alentar a mis subordinados para que los alcancen.", style: "COACH" } },
  { code: 36, top: { text: "En general, yo creo que los planes que se hagan deben presentar las ideas de mis subordinados.", style: "DEMOCRATA" }, bottom: { text: "Yo creo que un líder popular es mejor que uno impopular.", style: "AFILIADOR" } },
];

const CODES = ["A", "B"] as const;

// `test_items` no se expone aun en los tipos generados de la aplicacion (ver
// scripts/import-raven.ts), pero existe en la base de datos y es necesario
// para que el proceso sea reanudable (upsert por stem en vez de duplicar).
type LiderazgoDatabase = Database & {
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
type ServiceClient = SupabaseClient<LiderazgoDatabase>;

async function getOrCreateTest(db: ServiceClient) {
  const { data: existing, error: searchError } = await db
    .from("tests")
    .select("id, scoring_strategy, source")
    .eq("slug", TEST_SLUG)
    .maybeSingle();
  if (searchError) throw new Error(`No se pudo buscar la prueba: ${searchError.message}`);
  if (existing) {
    if (existing.scoring_strategy !== "ipsative" || existing.source !== "seed_licensed") {
      throw new Error(`Ya existe ${TEST_SLUG}, pero su configuración no corresponde al importador.`);
    }
    return existing.id as string;
  }

  const { data: created, error: createError } = await db
    .from("tests")
    .insert({
      slug: TEST_SLUG,
      name: TEST_NAME,
      description: "Identifica el estilo de liderazgo dominante (Capataz, Guía, Autoritario, Afiliador, Demócrata o Coach) a partir de 36 pares de afirmaciones de elección forzada.",
      instructions: "Elija cuál de las dos proposiciones está más de acuerdo con su manera de pensar.",
      source: "seed_licensed",
      scoring_strategy: "ipsative",
      scoring_config: {},
      is_timed: false,
      shuffle_items: false,
      shuffle_options: false,
      is_active: false,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(`No se pudo crear la prueba: ${createError?.message ?? "sin respuesta"}`);
  return created.id as string;
}

async function getOrCreateSubscales(db: ServiceClient, testId: string) {
  const { data: existing, error } = await db
    .from("test_subscales")
    .select("id, code")
    .eq("test_id", testId);
  if (error) throw new Error(`No se pudieron consultar las subescalas: ${error.message}`);

  const byCode = new Map((existing ?? []).map((s) => [s.code, s.id as string]));
  const missing = SUBSCALES.filter((s) => !byCode.has(s.code));
  if (missing.length) {
    const { data: created, error: insertError } = await db
      .from("test_subscales")
      .insert(
        missing.map((s) => ({
          test_id: testId,
          code: s.code,
          name: s.name,
          description: s.description,
          display_order: SUBSCALES.findIndex((x) => x.code === s.code) + 1,
        })),
      )
      .select("id, code");
    if (insertError) throw new Error(`No se pudieron crear las subescalas: ${insertError.message}`);
    for (const s of created ?? []) byCode.set(s.code, s.id as string);
  }
  return byCode;
}

async function main() {
  loadEnvConfig(process.cwd());

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  const db = createClient<LiderazgoDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testId = await getOrCreateTest(db);
  await getOrCreateSubscales(db, testId);

  const { data: savedItems, error: savedItemsError } = await db
    .from("test_items")
    .select("id, stem")
    .eq("test_id", testId);
  if (savedItemsError) throw new Error(`No se pudieron consultar los ítems existentes: ${savedItemsError.message}`);
  const itemIdByStem = new Map((savedItems ?? []).map((item) => [item.stem, item.id]));

  let completed = 0;
  const failures: string[] = [];

  for (const item of ITEMS) {
    const stem = `${item.code}. ${item.top.text} / ${item.bottom.text}`;
    try {
      const statements = [item.top, item.bottom];
      const options = CODES.map((code, i) => ({
        code,
        label: statements[i].text,
        display_order: i + 1,
        is_correct: false,
        points: 0,
      }));
      const forcedChoiceKey: Record<string, { most: string[]; least: string[] }> = {
        A: { most: [item.top.style], least: [] },
        B: { most: [item.bottom.style], least: [] },
      };

      const { error } = await db.rpc("admin_upsert_item", {
        p_test_id: testId,
        p_item_id: itemIdByStem.get(stem) ?? null,
        p_stem: stem,
        p_item_type: "forced_choice",
        p_subscale_id: null,
        p_is_reverse: false,
        p_media_url: null,
        p_answer_key: null,
        p_options: options,
        p_forced_choice_key: forcedChoiceKey,
      });
      if (error) throw new Error(error.message);
      completed += 1;
      console.log(`✓ ${item.code}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.code}: ${message}`);
      console.error(`✗ ${item.code}: ${message}`);
    }
  }

  console.log(`\nResumen: ${completed}/${ITEMS.length} ítems importados; ${failures.length} con error.`);
  console.log("La prueba quedó inactiva (is_active = false): revisa las claves contra el cuadernillo antes de activarla.");
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Importación cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
