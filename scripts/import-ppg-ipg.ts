import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";
import type { Database } from "../lib/supabase/types";

// Digitalizacion del PPG-IPG (Perfil e Inventario de Personalidad de Gordon)
// a partir de docuemntacion/125. PPG-IPG - Cuestionario de personalidad de
// Gordon/Cuestionario PPG – IPG.pdf.
//
// Formato: 38 "tetradas" de 4 frases (A-D). El candidato marca UNA frase como
// "mas se parece a mi" (most) y OTRA distinta como "menos se parece a mi"
// (least). Cada marca puede sumar puntos a mas de una escala a la vez — asi
// es el diseño ipsativo real del instrumento, no un simple "1 opcion = 1
// escala". Items 1-18 alimentan las 4 escalas del Perfil (ASC, RES, EST,
// SOC); items 19-38 alimentan las 4 del Inventario (CAU, ORI, COM, VIT).
// Autoestima (AE) = ASC+RES+EST+SOC, calculado en scoring.score_attempt.
//
// *** ADVERTENCIA SOBRE LA FUENTE DE LA CLAVE ***
// El manual disponible (Manual-Gordon.pdf, 11 paginas) trae la introduccion,
// interpretacion de escalas y tablas de percentiles, pero NO la tabla de
// asignacion item-escala: esa se aplica en el original con una plantilla
// perforada fisica, y el manual remite a un "Apendice A" que no esta en el
// archivo. La clave usada aqui se reconstruyo a partir de las formulas de
// docuemntacion/.../Software.xlsm (una planilla de terceros, no oficial).
// Se verifico que las 38 tetradas son 100% consistentes con un patron fijo
// (cada opcion tiene una direccion "exclusiva" a una escala y la direccion
// opuesta compartida por las otras tres de su familia), lo que da confianza
// en que replica la plantilla real, pero de todas formas debe verificarse
// contra la plantilla oficial antes de usar esta prueba en decisiones reales
// de contratacion. La prueba queda inactiva (is_active = false) a proposito.

type Mark = "most" | "least";
type OptionKey = Record<Mark, string[]>;
type ItemKey = Record<"A" | "B" | "C" | "D", OptionKey>;

const TEST_SLUG = "ppg-ipg-gordon";
const TEST_NAME = "PPG-IPG — Perfil e Inventario de Personalidad de Gordon";

const SUBSCALES: { code: string; name: string; description: string }[] = [
  { code: "ASC", name: "Ascendencia", description: "Papel activo y dominante en el grupo, seguridad al decidir." },
  { code: "RES", name: "Responsabilidad", description: "Perseverancia, tenacidad y confiabilidad en el trabajo." },
  { code: "EST", name: "Estabilidad Emocional", description: "Estabilidad emocional, baja ansiedad y tensión." },
  { code: "SOC", name: "Sociabilidad", description: "Gusto por estar y trabajar con otras personas." },
  { code: "CAU", name: "Cautela", description: "Consideración cuidadosa antes de decidir; aversión al riesgo." },
  { code: "ORI", name: "Originalidad", description: "Curiosidad intelectual, gusto por ideas y problemas difíciles." },
  { code: "COM", name: "Relaciones Personales", description: "Confianza y tolerancia hacia los demás." },
  { code: "VIT", name: "Vigor", description: "Vitalidad, energía y ritmo de trabajo." },
];

const ITEMS: { code: number; statements: [string, string, string, string]; key: ItemKey }[] = [
  { code: 1, statements: ["Tiene don de gentes en reuniones sociales", "Le falta confianza en sí mismo", "Es minucioso en todo lo que hace", "Tiene cierta tendencia a dejarse llevar por sus sentimientos"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, C: { most: ["ASC", "RES", "EST"], least: ["SOC"] }, D: { most: ["ASC"], least: ["RES", "EST", "SOC"] } } },
  { code: 2, statements: ["No le interesa relacionarse con los demás", "Es una persona sin tensiones ni ansiedad", "No es muy digno de confianza", "En las discusiones de grupo lleva la iniciativa"], key: { A: { most: ["RES"], least: ["ASC", "EST", "SOC"] }, B: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, C: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, D: { most: ["ASC", "RES", "SOC"], least: ["EST"] } } },
  { code: 3, statements: ["Se comporta de una forma un tanto impulsiva y nerviosa", "Tiene mucha influencia sobre los demás", "No le gustan las relaciones sociales", "Trabaja de un modo muy constante y tenaz"], key: { A: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, B: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, C: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, D: { most: ["RES", "EST", "SOC"], least: ["ASC"] } } },
  { code: 4, statements: ["Le resulta fácil hacer nuevas amistades", "No puede estar mucho tiempo haciendo lo mismo", "Se deja llevar fácilmente por los demás", "Se sabe controlar aunque le salgan las cosas mal"], key: { A: { most: ["ASC", "RES", "SOC"], least: ["EST"] }, B: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, C: { most: ["RES"], least: ["ASC", "EST", "SOC"] }, D: { most: ["ASC", "RES", "EST"], least: ["SOC"] } } },
  { code: 5, statements: ["Es capaz de tomar decisiones importantes sin la ayuda de nadie", "Le resulta difícil desenvolverse con soltura ante desconocidos", "Tiende a sentirse incómodo y en tensión", "Termina su trabajo a pesar de las dificultades"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, C: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, D: { most: ["RES", "EST", "SOC"], least: ["ASC"] } } },
  { code: 6, statements: ["No le interesa demasiado relacionarse con los demás", "No asume responsabilidades con seriedad", "En todo momento se siente seguro de sí mismo y sereno", "Asume la dirección en actividades de grupo"], key: { A: { most: ["RES"], least: ["ASC", "EST", "SOC"] }, B: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, C: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, D: { most: ["ASC", "RES", "SOC"], least: ["EST"] } } },
  { code: 7, statements: ["Es una persona en quien se puede confiar", "Pierde la calma con facilidad cuando las cosas le salen mal", "No se siente muy seguro de sus propias decisiones", "Prefiere estar con gente"], key: { A: { most: ["ASC", "RES", "EST"], least: ["SOC"] }, B: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, C: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, D: { most: ["ASC", "EST", "SOC"], least: ["RES"] } } },
  { code: 8, statements: ["Le resulta fácil influir en los demás", "Lleva a cabo su trabajo a pesar de los obstáculos", "Tiene pocos pero buenos amigos", "Es una persona más bien nerviosa"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, C: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, D: { most: ["SOC"], least: ["ASC", "RES", "EST"] } } },
  { code: 9, statements: ["No hace amigos muy fácilmente", "Toma parte activa en los asuntos de su grupo", "No abandona las tareas monótonas hasta que las termina", "Es una persona poco equilibrada emocionalmente"], key: { A: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, B: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, C: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, D: { most: ["SOC"], least: ["ASC", "RES", "EST"] } } },
  { code: 10, statements: ["Se siente seguro en sus relaciones con los demás", "Sus sentimientos son heridos con facilidad", "Sus hábitos de trabajo están bien desarrollados", "Prefiere estar con un grupo reducido de amigos"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, C: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, D: { most: ["EST"], least: ["ASC", "RES", "SOC"] } } },
  { code: 11, statements: ["Se enfada con bastante facilidad", "Es capaz de controlar la situación en todo momento", "No le gusta hablar con personas a quienes no conoce", "Es muy minucioso en todo lo que hace"], key: { A: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, B: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, C: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, D: { most: ["RES", "EST", "SOC"], least: ["ASC"] } } },
  { code: 12, statements: ["No le gusta discutir con los demás", "Es incapaz de ajustarse a un horario fijo", "Es una persona tranquila y sosegada", "Tiende a ser muy sociable"], key: { A: { most: ["RES"], least: ["ASC", "EST", "SOC"] }, B: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, C: { most: ["ASC", "RES", "EST"], least: ["SOC"] }, D: { most: ["ASC", "RES", "SOC"], least: ["EST"] } } },
  { code: 13, statements: ["Es un individuo despreocupado", "Carece del sentido de la responsabilidad", "No le interesan las personas del sexo opuesto", "Sabe cómo tratar a la gente"], key: { A: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, B: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, C: { most: ["RES"], least: ["ASC", "EST", "SOC"] }, D: { most: ["ASC", "RES", "SOC"], least: ["EST"] } } },
  { code: 14, statements: ["Le resulta fácil ser amable con los demás", "Prefiere dejar a otros la dirección de las actividades del grupo", "Su carácter le hace preocuparse por todo", "Sigue haciendo un trabajo a pesar de las dificultades"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, C: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, D: { most: ["ASC", "RES", "EST"], least: ["SOC"] } } },
  { code: 15, statements: ["Es capaz de conseguir que los demás cambien de opinión", "No le interesa unirse a las actividades de un grupo", "Es un individuo bastante nervioso", "Es muy constante en cualquier tarea que ha emprendido"], key: { A: { most: ["ASC", "EST", "SOC"], least: ["RES"] }, B: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, C: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, D: { most: ["RES", "EST", "SOC"], least: ["ASC"] } } },
  { code: 16, statements: ["Es tranquilo y fácil de tratar", "Le cuesta seguir haciendo lo que lleva entre manos", "Le gusta estar rodeado de mucha gente", "No se siente muy seguro de sus aptitudes"], key: { A: { most: ["ASC", "RES", "EST"], least: ["SOC"] }, B: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, C: { most: ["ASC", "RES", "SOC"], least: ["EST"] }, D: { most: ["RES"], least: ["ASC", "EST", "SOC"] } } },
  { code: 17, statements: ["Se puede confiar plenamente en él", "No le gusta la compañía de la mayoría de la gente", "Le resulta difícil estar tranquilo", "Toma parte activa en las discusiones del grupo"], key: { A: { most: ["RES", "EST", "SOC"], least: ["ASC"] }, B: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, C: { most: ["SOC"], least: ["ASC", "RES", "EST"] }, D: { most: ["ASC", "EST", "SOC"], least: ["RES"] } } },
  { code: 18, statements: ["Cuando tiene un problema no se da fácilmente por vencido", "Tiende a veces a manifestarse nervioso", "Le falta confianza en sí mismo", "Prefiere pasar el tiempo en compañía de otros"], key: { A: { most: ["ASC", "RES", "EST"], least: ["SOC"] }, B: { most: ["ASC"], least: ["RES", "EST", "SOC"] }, C: { most: ["EST"], least: ["ASC", "RES", "SOC"] }, D: { most: ["ASC", "EST", "SOC"], least: ["RES"] } } },
  { code: 19, statements: ["Tiene ideas muy originales", "Es una persona un tanto lenta y tranquila", "Tiende a criticar a los demás", "Toma decisiones después de haberlas meditado mucho"], key: { A: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, B: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, C: { most: ["VIT"], least: ["CAU", "ORI", "COM"] }, D: { most: ["CAU", "COM", "VIT"], least: ["ORI"] } } },
  { code: 20, statements: ["Cree que todo el mundo es esencialmente sincero", "Se toma con cierta calma tanto el trabajo como el juego", "Tiende a averiguar el porqué de las cosas", "Tiende a actuar impulsivamente"], key: { A: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, B: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, C: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, D: { most: ["VIT"], least: ["CAU", "ORI", "COM"] } } },
  { code: 21, statements: ["Es una persona muy activa", "No se enfada con nadie", "No le gusta trabajar en tareas complicadas y difíciles", "Prefiere fiestas movidas a reuniones tranquilas"], key: { A: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, B: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, C: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, D: { most: ["ORI"], least: ["CAU", "COM", "VIT"] } } },
  { code: 22, statements: ["Le gustan las discusiones de carácter filosófico", "Se cansa con bastante facilidad", "Piensa mucho antes de obrar", "No tiene mucha confianza en los demás"], key: { A: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, B: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, C: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, D: { most: ["VIT"], least: ["CAU", "ORI", "COM"] } } },
  { code: 23, statements: ["Le gusta ante todo trabajar con ideas", "Hace las cosas a un ritmo más bien lento", "Es muy prudente al tomar una decisión", "Le resulta difícil llevarse bien con bastante gente"], key: { A: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, B: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, C: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, D: { most: ["VIT"], least: ["CAU", "ORI", "COM"] } } },
  { code: 24, statements: ["Es una persona a la que le gusta 'probar fortuna'", "Se enfada con los otros con bastante facilidad", "Consigue hacer muchas cosas en poco tiempo", "Pasa bastante tiempo elaborando nuevas ideas"], key: { A: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, B: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, C: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, D: { most: ["CAU", "ORI", "COM"], least: ["VIT"] } } },
  { code: 25, statements: ["Es un individuo con mucha paciencia", "Busca lo interesante y lo apasionante", "Es capaz de estar trabajando mucho tiempo seguido", "Le gusta más llevar a cabo un proyecto que planearlo"], key: { A: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, B: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, C: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, D: { most: ["CAU"], least: ["ORI", "COM", "VIT"] } } },
  { code: 26, statements: ["Se encuentra muy cansado y fatigado al terminar el día", "Se inclina a hacer juicios de repente y con rapidez", "No es rencoroso con los demás", "Tiene un gran afán de saber"], key: { A: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, B: { most: ["VIT"], least: ["CAU", "ORI", "COM"] }, C: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, D: { most: ["CAU", "ORI", "VIT"], least: ["COM"] } } },
  { code: 27, statements: ["No actúa al primer impulso", "Le molestan los fallos de los demás", "No tiene interés para juzgar con un sentido crítico", "Prefiere trabajar con rapidez"], key: { A: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, B: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, C: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, D: { most: ["ORI", "COM", "VIT"], least: ["CAU"] } } },
  { code: 28, statements: ["Tiende a sentirse molesto con la gente", "Le gusta estar siempre en continua actividad", "Prefiere no aventurarse a correr riesgos", "Prefiere un trabajo que exija poco o nada pensar con originalidad"], key: { A: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, B: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, C: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, D: { most: ["COM"], least: ["CAU", "ORI", "VIT"] } } },
  { code: 29, statements: ["Es una persona muy precavida", "Prefiere trabajar de una manera más bien lenta", "Tiene mucho tacto y diplomacia", "Prefiere no emplear la inteligencia en pensamientos profundos"], key: { A: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, B: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, C: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, D: { most: ["VIT"], least: ["CAU", "ORI", "COM"] } } },
  { code: 30, statements: ["Pierde fácilmente la paciencia con la gente", "Tiene algo menos de aguante que la mayoría de la gente", "Tiende a ser original y creador", "No le gustan demasiado las emociones y sensaciones nuevas"], key: { A: { most: ["VIT"], least: ["CAU", "ORI", "COM"] }, B: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, C: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, D: { most: ["CAU", "COM", "VIT"], least: ["ORI"] } } },
  { code: 31, statements: ["Tiende a actuar por corazonadas", "Tiene mucha vitalidad y energía", "No confía en los demás hasta tener garantías", "Le gustan los temas que exigen mucha reflexión"], key: { A: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, B: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, C: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, D: { most: ["CAU", "ORI", "COM"], least: ["VIT"] } } },
  { code: 32, statements: ["No le gusta trabajar a un ritmo rápido", "Tiene mucha confianza en la gente", "Tiende a ceder a los deseos del momento", "Disfruta resolviendo problemas complicados"], key: { A: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, B: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, C: { most: ["VIT"], least: ["CAU", "ORI", "COM"] }, D: { most: ["CAU", "ORI", "VIT"], least: ["COM"] } } },
  { code: 33, statements: ["Es un trabajador muy activo", "Sabe aceptar bien las críticas", "No le interesan los problemas que exigen razonar mucho", "Tiende a actuar primero y a pensar después"], key: { A: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, B: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, C: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, D: { most: ["ORI"], least: ["CAU", "COM", "VIT"] } } },
  { code: 34, statements: ["Siempre habla bien de los otros", "Es muy precavido antes de obrar", "No le interesa discutir de cosas que obliguen a pensar", "No se da prisa en ir de un lado a otro"], key: { A: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, B: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, C: { most: ["VIT"], least: ["CAU", "ORI", "COM"] }, D: { most: ["ORI"], least: ["CAU", "COM", "VIT"] } } },
  { code: 35, statements: ["No tiene una mente inquisitiva", "No actúa al primer impulso", "Generalmente está rebosante de energía", "Se irrita por las debilidades de los demás"], key: { A: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, B: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, C: { most: ["ORI", "COM", "VIT"], least: ["CAU"] }, D: { most: ["ORI"], least: ["CAU", "COM", "VIT"] } } },
  { code: 36, statements: ["Es capaz de realizar más cosas que los demás", "Le gusta aventurarse sólo por lo que tiene de diversión", "Le molesta que le critiquen", "Le gusta más trabajar con ideas que con objetos"], key: { A: { most: ["CAU", "COM", "VIT"], least: ["ORI"] }, B: { most: ["COM"], least: ["CAU", "ORI", "VIT"] }, C: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, D: { most: ["CAU", "ORI", "COM"], least: ["VIT"] } } },
  { code: 37, statements: ["Confía mucho en los demás", "Prefiere los trabajos rutinarios y sencillos", "Hace las cosas 'de golpe'", "Rebosa vitalidad y energía"], key: { A: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, B: { most: ["CAU"], least: ["ORI", "COM", "VIT"] }, C: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, D: { most: ["CAU", "ORI", "VIT"], least: ["COM"] } } },
  { code: 38, statements: ["Toma decisiones con demasiada rapidez", "Cualquier persona le cae bien", "Mantiene un ritmo activo, tanto en el trabajo como en el juego", "No tiene un gran interés por aprender cosas nuevas"], key: { A: { most: ["ORI"], least: ["CAU", "COM", "VIT"] }, B: { most: ["CAU", "ORI", "COM"], least: ["VIT"] }, C: { most: ["CAU", "ORI", "VIT"], least: ["COM"] }, D: { most: ["CAU"], least: ["ORI", "COM", "VIT"] } } },
];

const CODES = ["A", "B", "C", "D"] as const;

// `test_items` no se expone aun en los tipos generados de la aplicacion (ver
// scripts/import-raven.ts), pero existe en la base de datos y es necesario
// para que el proceso sea reanudable (upsert por stem en vez de duplicar).
type PpgIpgDatabase = Database & {
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
type ServiceClient = SupabaseClient<PpgIpgDatabase>;

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
      description: "Perfil e Inventario de Personalidad de Gordon: 8 escalas de personalidad mediante 38 tétradas de elección forzada.",
      instructions:
        "En cada grupo de 4 frases, marca la que MÁS se parece a ti y la que MENOS se parece a ti. Debes marcar exactamente dos frases distintas en cada grupo.",
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
  const db = createClient<PpgIpgDatabase>(url, serviceRoleKey, {
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
    const stem = `${item.code}. Elige la frase que más y la que menos se parecen a ti.`;
    try {
      const options = CODES.map((code, i) => ({
        code,
        label: item.statements[i],
        display_order: i + 1,
        is_correct: false,
        points: 0,
      }));
      const forcedChoiceKey: Record<string, OptionKey> = {
        A: item.key.A,
        B: item.key.B,
        C: item.key.C,
        D: item.key.D,
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

  console.log(`\nResumen: ${completed}/${ITEMS.length} tétradas importadas; ${failures.length} con error.`);
  console.log(
    "La prueba quedó inactiva (is_active = false): la clave de corrección se reconstruyó de una " +
      "planilla no oficial (ver advertencia en el encabezado de este script) y debe verificarse " +
      "contra la plantilla perforada real antes de usarse en decisiones de contratación.",
  );
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Importación cancelada: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
