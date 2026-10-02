import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AttemptItem, AttemptState, ItemConfig, TracePoint } from "@/lib/supabase/types";

import figures from "../../wonderlic-import/figures.json";

const rpc = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sileo", () => ({ sileo: { warning: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { Runner } from "@/app/evaluacion/[attemptId]/runner";

const fig38 = figures["38"] as { viewBox: [number, number, number, number]; points: TracePoint[] };
const fig42 = figures["42"] as { viewBox: [number, number, number, number]; points: TracePoint[] };

const STEM_IMG = "https://signed.example/stem.png";

function item(partial: Partial<AttemptItem> & Pick<AttemptItem, "id" | "type">): AttemptItem {
  return { stem: partial.id, media_url: null, config: {}, options: [], ...partial };
}

const item7 = item({
  id: "i7",
  type: "mcq_image",
  stem: "7. ¿Cuál figura puede formarse con estas dos partes?",
  media_url: STEM_IMG,
  config: { numberOptions: true, mediaRatio: "130/74" },
  options: [1, 2, 3, 4, 5].map((n) => ({
    id: `i7-o${n}`,
    code: String.fromCharCode(96 + n),
    label: `Figura ${n}`,
    media_url: `https://signed.example/opt-${n}.png`,
  })),
});

const traceConfig = (figure: typeof fig38): ItemConfig => ({
  interaction: "line_trace",
  viewBox: figure.viewBox,
  points: figure.points,
});

const item38 = item({
  id: "i38",
  type: "free_response",
  stem: "38. Traza esa línea uniendo dos de los números.",
  media_url: STEM_IMG,
  config: traceConfig(fig38),
});
const item42 = item({
  id: "i42",
  type: "free_response",
  stem: "42. Traza esa línea uniendo dos de los números.",
  media_url: STEM_IMG,
  config: traceConfig(fig42),
});
const item49 = item({
  id: "i49",
  type: "free_response",
  stem: "49. Cuatro de las cinco piezas forman un triángulo. ¿Cuáles son?",
  media_url: STEM_IMG,
  config: { interaction: "pick_pieces", pick: 4, cell: figures["49"].cell as [number, number], pieces: figures["49"].pieces },
});

function stateWith(items: AttemptItem[]): AttemptState {
  return {
    attempt_id: "att-1",
    status: "in_progress",
    test: { name: "Wonderlic", instructions: null, is_timed: false, item_time_limit_seconds: null },
    server_now: new Date().toISOString(),
    deadline_at: null,
    seconds_remaining: null,
    items,
    responses: {},
  };
}

function mount(items: AttemptItem[]) {
  const user = userEvent.setup();
  render(<Runner state={stateWith(items)} likertLabels={[]} applicationId="app-1" />);
  const next = () => screen.getByRole("button", { name: /^(Siguiente|Finalizar prueba)$/ });
  const savedCalls = () => rpc.mock.calls.filter(([name]) => name === "save_response").map(([, args]) => args);
  return { user, next, savedCalls };
}

beforeEach(() => {
  rpc.mockReset();
  router.replace.mockReset();
  rpc.mockImplementation(async (name: string) =>
    name === "save_response" ? { data: { seconds_remaining: null }, error: null } : { data: null, error: null },
  );
});

describe("Runner · ítem 7 (opción múltiple con figuras)", () => {
  it("muestra la lámina y 5 figuras numeradas; 'Siguiente' espera una elección", async () => {
    const { next } = mount([item7, item38]);
    expect(screen.getByAltText("Lámina de la pregunta")).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: `Figura ${n}` })).toBeInTheDocument();
    }
    expect(next()).toBeDisabled();
  });

  it("al elegir la figura 3 guarda esa opción (sin texto) y avanza", async () => {
    const { user, next, savedCalls } = mount([item7, item38]);
    await user.click(screen.getByRole("button", { name: "Figura 3" }));
    expect(next()).toBeEnabled();
    await user.click(next());

    await screen.findByText(/Pregunta 2 de 2/);
    expect(savedCalls()).toEqual([
      expect.objectContaining({
        p_attempt_id: "att-1",
        p_item_id: "i7",
        p_option_id: "i7-o3",
        p_value_text: null,
      }),
    ]);
  });
});

describe("Runner · ítems 38 y 42 (trazar línea)", () => {
  it("muestra la figura interactiva y NO la imagen de respaldo ni la casilla de texto", () => {
    mount([item38]);
    expect(screen.getByRole("button", { name: "Punto 6" })).toBeInTheDocument();
    expect(screen.queryByAltText("Lámina de la pregunta")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("'Siguiente' se habilita solo con dos puntos y guarda la respuesta canónica", async () => {
    const { user, next, savedCalls } = mount([item38, item42]);
    expect(next()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Punto 9" }));
    expect(next()).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Punto 6" }));
    expect(next()).toBeEnabled();

    await user.click(next());
    await screen.findByText(/Pregunta 2 de 2/);
    expect(savedCalls()).toEqual([
      expect.objectContaining({ p_item_id: "i38", p_option_id: null, p_value_text: "6,9" }),
    ]);
  });

  it("al pasar al siguiente ítem la selección anterior no se arrastra", async () => {
    const { user, next } = mount([item38, item42]);
    await user.click(screen.getByRole("button", { name: "Punto 6" }));
    await user.click(screen.getByRole("button", { name: "Punto 9" }));
    await user.click(next());
    await screen.findByText(/Pregunta 2 de 2/);

    expect(screen.getAllByRole("button", { name: /^Punto \d+$/ })).toHaveLength(24);
    for (const point of screen.getAllByRole("button", { name: /^Punto \d+$/ })) {
      expect(point).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByRole("button", { name: /^Finalizar prueba$/ })).toBeDisabled();
  });

  it("borrar el trazo vuelve a deshabilitar 'Siguiente'", async () => {
    const { user, next } = mount([item38]);
    await user.click(screen.getByRole("button", { name: "Punto 6" }));
    await user.click(screen.getByRole("button", { name: "Punto 9" }));
    expect(next()).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /borrar trazo/i }));
    expect(next()).toBeDisabled();
  });
});

describe("Runner · ítem 49 (elegir piezas)", () => {
  it("con 3 piezas no se puede avanzar; con 4 guarda '2,3,4,5' y finaliza la prueba", async () => {
    const { user, next, savedCalls } = mount([item49]);

    for (const n of [5, 3, 2]) await user.click(screen.getByRole("button", { name: `Pieza ${n}` }));
    expect(next()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Pieza 4" }));
    expect(next()).toBeEnabled();
    await user.click(next());

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("finish_attempt", { p_attempt_id: "att-1" }));
    expect(savedCalls()).toEqual([
      expect.objectContaining({ p_item_id: "i49", p_option_id: null, p_value_text: "2,3,4,5" }),
    ]);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/postulaciones/app-1"));
  });

  it("no muestra la imagen de respaldo ni la casilla de texto", () => {
    mount([item49]);
    expect(screen.queryByAltText("Lámina de la pregunta")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("Runner · respaldo cuando no hay configuración interactiva", () => {
  const fallback = item({
    id: "f1",
    type: "free_response",
    stem: "38. Traza esa línea uniendo dos de los números.",
    media_url: STEM_IMG,
    config: {},
  });

  it("sin config muestra la imagen y una casilla de texto que acepta '6,9'", async () => {
    const { user, next, savedCalls } = mount([fallback]);
    expect(screen.getByAltText("Lámina de la pregunta")).toBeInTheDocument();
    expect(next()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "6,9");
    expect(next()).toBeEnabled();
    await user.click(next());
    await waitFor(() => expect(savedCalls()).toHaveLength(1));
    expect(savedCalls()[0]).toMatchObject({ p_item_id: "f1", p_value_text: "6,9" });
  });

  it("una config incompleta (sin puntos) no rompe: cae a la casilla de texto", () => {
    mount([{ ...fallback, config: { interaction: "line_trace" } }]);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Punto/ })).not.toBeInTheDocument();
  });

  it("config null (clientes/datos antiguos) también cae a la casilla de texto", () => {
    mount([{ ...fallback, config: null }]);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

describe("Runner · sin conexión", () => {
  it("si falla el guardado, la respuesta interactiva queda en cola local con su texto", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "save_response" ? { data: null, error: { message: "offline" } } : { data: null, error: null },
    );
    const { user, next } = mount([item38, item42]);

    await user.click(screen.getByRole("button", { name: "Punto 6" }));
    await user.click(screen.getByRole("button", { name: "Punto 9" }));
    await user.click(next());

    await screen.findByText(/Pregunta 2 de 2/);
    const queue = JSON.parse(localStorage.getItem("attempt:att-1:queue") ?? "[]");
    expect(queue).toEqual([expect.objectContaining({ itemId: "i38", optionId: null, valueText: "6,9" })]);
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });
});
