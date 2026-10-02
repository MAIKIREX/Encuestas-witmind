import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PiecePicker } from "@/components/evaluation/piece-picker";

import figures from "../../wonderlic-import/figures.json";

const { pieces, cell } = figures["49"];

function setup(pick = 4) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<PiecePicker pieces={pieces} cell={cell as [number, number]} pick={pick} onChange={onChange} />);
  const piece = (n: number) => screen.getByRole("button", { name: `Pieza ${n}` });
  const lastAnswer = () => onChange.mock.calls.at(-1)?.[0];
  return { user, onChange, piece, lastAnswer };
}

describe("PiecePicker", () => {
  it("muestra las 5 piezas y el contador en cero", () => {
    setup();
    expect(screen.getAllByRole("button", { name: /^Pieza \d$/ })).toHaveLength(5);
    expect(screen.getByText(/Piezas elegidas:/)).toHaveTextContent("Piezas elegidas: 0 de 4.");
  });

  it("la respuesta sigue incompleta (null) hasta elegir exactamente 4", async () => {
    const { user, piece, lastAnswer } = setup();
    await user.click(piece(5));
    await user.click(piece(3));
    await user.click(piece(2));
    expect(lastAnswer()).toBeNull();
    expect(screen.getByText(/Piezas elegidas:/)).toHaveTextContent("Piezas elegidas: 3 de 4.");
  });

  it("al elegir 4 reporta los números ordenados, sin importar el orden de los toques", async () => {
    const { user, piece, lastAnswer } = setup();
    for (const n of [5, 3, 4, 2]) await user.click(piece(n));
    expect(lastAnswer()).toBe("2,3,4,5");
  });

  it("con 4 elegidas bloquea las demás y no permite una quinta", async () => {
    const { user, piece, lastAnswer, onChange } = setup();
    for (const n of [2, 3, 4, 5]) await user.click(piece(n));
    const calls = onChange.mock.calls.length;
    expect(piece(1)).toHaveAttribute("aria-disabled", "true");
    await user.click(piece(1));
    expect(piece(1)).toHaveAttribute("aria-pressed", "false");
    expect(onChange.mock.calls.length).toBe(calls);
    expect(lastAnswer()).toBe("2,3,4,5");
    expect(screen.getByText(/Desmarca una/)).toBeInTheDocument();
  });

  it("desmarcar una pieza vuelve la respuesta a incompleta y libera las demás", async () => {
    const { user, piece, lastAnswer } = setup();
    for (const n of [2, 3, 4, 5]) await user.click(piece(n));
    await user.click(piece(3));
    expect(lastAnswer()).toBeNull();
    expect(piece(1)).toHaveAttribute("aria-disabled", "false");
  });

  it("permite cambiar una pieza por otra y recalcula la respuesta", async () => {
    const { user, piece, lastAnswer } = setup();
    for (const n of [2, 3, 4, 5]) await user.click(piece(n));
    await user.click(piece(3));
    await user.click(piece(1));
    expect(lastAnswer()).toBe("1,2,4,5");
  });

  it("marca visualmente las elegidas con aria-pressed", async () => {
    const { user, piece } = setup();
    await user.click(piece(2));
    expect(piece(2)).toHaveAttribute("aria-pressed", "true");
    expect(piece(3)).toHaveAttribute("aria-pressed", "false");
  });

  it("se opera con teclado", async () => {
    const { user, piece, lastAnswer } = setup(1);
    piece(4).focus();
    await user.keyboard("{Enter}");
    expect(lastAnswer()).toBe("4");
  });
});
