import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { canonicalPair, FigureTrace } from "@/components/evaluation/figure-trace";
import type { TracePoint } from "@/lib/supabase/types";

import figures from "../../wonderlic-import/figures.json";

const fig38 = figures["38"] as { viewBox: [number, number, number, number]; points: TracePoint[] };
const fig42 = figures["42"] as { viewBox: [number, number, number, number]; points: TracePoint[] };

function setup(figure = fig38) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const view = render(<FigureTrace viewBox={figure.viewBox} points={figure.points} onChange={onChange} />);
  const point = (n: number) => screen.getByRole("button", { name: `Punto ${n}` });
  const lastAnswer = () => onChange.mock.calls.at(-1)?.[0];
  return { user, onChange, point, lastAnswer, container: view.container };
}

describe("canonicalPair", () => {
  it("ordena el par de menor a mayor", () => {
    expect(canonicalPair(9, 6)).toBe("6,9");
    expect(canonicalPair(6, 9)).toBe("6,9");
    expect(canonicalPair(3, 22)).toBe("3,22");
    expect(canonicalPair(22, 3)).toBe("3,22");
  });
});

describe("FigureTrace", () => {
  it("dibuja un punto accionable por cada número de la figura", () => {
    setup(fig42);
    expect(screen.getAllByRole("button", { name: /^Punto \d+$/ })).toHaveLength(24);
  });

  it("empieza sin selección: invita a tocar un punto y 'Borrar trazo' está deshabilitado", () => {
    setup();
    expect(screen.getByText("Toca un punto para empezar la línea.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /borrar trazo/i })).toBeDisabled();
  });

  it("con un solo punto la respuesta sigue incompleta (null)", async () => {
    const { user, point, lastAnswer } = setup();
    await user.click(point(6));
    expect(lastAnswer()).toBeNull();
    expect(point(6)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Punto de partida:/)).toHaveTextContent("Punto de partida: 6");
  });

  it("con dos puntos reporta la respuesta canónica y dibuja la línea", async () => {
    const { user, point, lastAnswer, container } = setup();
    await user.click(point(6));
    await user.click(point(9));
    expect(lastAnswer()).toBe("6,9");
    expect(container.querySelectorAll("line")).toHaveLength(1);
    expect(screen.getByText(/Línea trazada entre el punto/)).toHaveTextContent(
      "Línea trazada entre el punto 6 y el punto 9.",
    );
  });

  it("trazar 9→6 equivale a 6→9", async () => {
    const { user, point, lastAnswer } = setup();
    await user.click(point(9));
    await user.click(point(6));
    expect(lastAnswer()).toBe("6,9");
  });

  it("figura 42: 22→3 se reporta como '3,22'", async () => {
    const { user, point, lastAnswer } = setup(fig42);
    await user.click(point(22));
    await user.click(point(3));
    expect(lastAnswer()).toBe("3,22");
  });

  it("un tercer toque descarta la línea y empieza una nueva", async () => {
    const { user, point, lastAnswer, container } = setup();
    await user.click(point(6));
    await user.click(point(9));
    await user.click(point(12));
    expect(lastAnswer()).toBeNull();
    expect(container.querySelectorAll("line")).toHaveLength(0);
    expect(point(12)).toHaveAttribute("aria-pressed", "true");
    expect(point(6)).toHaveAttribute("aria-pressed", "false");
    expect(point(9)).toHaveAttribute("aria-pressed", "false");
  });

  it("tocar de nuevo un punto elegido lo deselecciona", async () => {
    const { user, point, lastAnswer } = setup();
    await user.click(point(6));
    await user.click(point(9));
    await user.click(point(9));
    expect(lastAnswer()).toBeNull();
    expect(point(9)).toHaveAttribute("aria-pressed", "false");
    expect(point(6)).toHaveAttribute("aria-pressed", "true");
  });

  it("'Borrar trazo' limpia la selección y la respuesta", async () => {
    const { user, point, lastAnswer, container } = setup();
    await user.click(point(6));
    await user.click(point(9));
    await user.click(screen.getByRole("button", { name: /borrar trazo/i }));
    expect(lastAnswer()).toBeNull();
    expect(container.querySelectorAll("line")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /borrar trazo/i })).toBeDisabled();
    expect(screen.getByText("Toca un punto para empezar la línea.")).toBeInTheDocument();
  });

  it("se puede resolver solo con teclado (Enter y Espacio)", async () => {
    const { user, point, lastAnswer } = setup();
    point(6).focus();
    await user.keyboard("{Enter}");
    point(9).focus();
    await user.keyboard(" ");
    expect(lastAnswer()).toBe("6,9");
  });

  it("los puntos son enfocables con Tab y exponen su número a lectores de pantalla", async () => {
    const { user, point } = setup();
    await user.tab();
    expect(point(1)).toHaveFocus();
    expect(point(1)).toHaveAttribute("tabindex", "0");
  });
});

describe("posición de los números", () => {
  function inside(px: number, py: number, pts: TracePoint[]) {
    let hit = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  }

  it.each([
    ["38", fig38],
    ["42", fig42],
  ])("figura %s: cada número queda FUERA del contorno, sin tapar las líneas", (_code, figure) => {
    const { container } = setup(figure);
    const labels = [...container.querySelectorAll("text")];
    expect(labels).toHaveLength(figure.points.length);
    for (const label of labels) {
      const x = Number(label.getAttribute("x"));
      const y = Number(label.getAttribute("y"));
      expect(inside(x, y, figure.points), `número ${label.textContent}`).toBe(false);
    }
  });
});
