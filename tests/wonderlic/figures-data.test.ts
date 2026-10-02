import { describe, expect, it } from "vitest";

import figures from "../../wonderlic-import/figures.json";
import { isSimplePolygon, polygonArea, squareCuts } from "./geometry";

const trace = { "38": figures["38"], "42": figures["42"] };

describe.each(Object.entries(trace))("figura %s (trazado de línea)", (code, figure) => {
  const { points, viewBox } = figure;

  it("numera los puntos de 1 a N sin saltos ni repetidos", () => {
    expect(points.map((p) => p.n)).toEqual(points.map((_, i) => i + 1));
  });

  it("tiene la cantidad de puntos del cuadernillo", () => {
    expect(points).toHaveLength(code === "38" ? 14 : 24);
  });

  it("no repite coordenadas", () => {
    const unique = new Set(points.map((p) => `${p.x},${p.y}`));
    expect(unique.size).toBe(points.length);
  });

  it("deja todos los puntos dentro del viewBox con margen para los números", () => {
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(20);
      expect(p.y).toBeGreaterThanOrEqual(20);
      expect(p.x).toBeLessThanOrEqual(viewBox[2] - 20);
      expect(p.y).toBeLessThanOrEqual(viewBox[3] - 20);
    }
  });

  it("recorre el contorno en orden: el polígono no se cruza consigo mismo", () => {
    expect(isSimplePolygon(points)).toBe(true);
  });

  it("encierra un área que es un cuadrado perfecto (condición para formar el cuadrado)", () => {
    const side = Math.sqrt(polygonArea(points));
    expect(Math.abs(side - Math.round(side))).toBeLessThan(0.05);
  });
});

describe("figura 38 (corazón en diagonales)", () => {
  it("todas sus aristas van a ~45°", () => {
    const { points } = figures["38"];
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      const angle = (Math.atan2(Math.abs(q.y - p.y), Math.abs(q.x - p.x)) * 180) / Math.PI;
      expect(Math.abs(angle - 45)).toBeLessThan(3);
    });
  });

  it("la clave 6-9 es una cuerda interior que reparte el área en dos partes", () => {
    const { points } = figures["38"];
    const ring = (from: number, to: number) => {
      const out = [];
      for (let n = from; ; n = (n % points.length) + 1) {
        out.push(points[n - 1]);
        if (n === to) break;
      }
      return out;
    };
    const a = ring(6, 9);
    const b = ring(9, 6);
    expect(polygonArea(a)).toBeGreaterThan(0);
    expect(polygonArea(b)).toBeGreaterThan(0);
    expect(polygonArea(a) + polygonArea(b)).toBeCloseTo(polygonArea(points), 3);
    expect(isSimplePolygon(a) && isSimplePolygon(b)).toBe(true);
  });
});

describe("figura 42 (poliominó de 16 celdas)", () => {
  it("todas sus aristas son horizontales o verticales y miden una celda", () => {
    const { points } = figures["42"];
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      const dx = Math.abs(q.x - p.x);
      const dy = Math.abs(q.y - p.y);
      expect(Math.min(dx, dy)).toBeCloseTo(0, 1);
      expect(Math.max(dx, dy)).toBeCloseTo(36, 1);
    });
  });

  it("el ÚNICO corte que forma un cuadrado es 3-22, igual que la clave", () => {
    expect(squareCuts(figures["42"].points)).toEqual([[3, 22]]);
  });

  it("cortes erróneos (p. ej. 2-23, 5-17) no forman cuadrado", () => {
    const cuts = squareCuts(figures["42"].points).map((c) => c.join("-"));
    expect(cuts).not.toContain("2-23");
    expect(cuts).not.toContain("5-17");
  });
});

describe("figura 49 (piezas)", () => {
  const { pieces, cell } = figures["49"];
  const byNumber = new Map(pieces.map((p) => [p.n, p.points]));

  it("tiene 5 piezas numeradas de 1 a 5", () => {
    expect(pieces.map((p) => p.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it("cada pieza cabe en la celda con margen", () => {
    for (const piece of pieces) {
      for (const p of piece.points) {
        expect(p.x).toBeGreaterThanOrEqual(2);
        expect(p.y).toBeGreaterThanOrEqual(2);
        expect(p.x).toBeLessThanOrEqual(cell[0] - 2);
        expect(p.y).toBeLessThanOrEqual(cell[1] - 2);
      }
      expect(isSimplePolygon(piece.points)).toBe(true);
    }
  });

  it("conserva la forma y la escala relativa del cuadernillo (áreas en pt²)", () => {
    const area = (n: number) => polygonArea(byNumber.get(n)!);
    expect(byNumber.get(1)).toHaveLength(3);
    expect(byNumber.get(4)).toHaveLength(3);
    expect(byNumber.get(2)).toHaveLength(6);
    expect(byNumber.get(3)).toHaveLength(4);
    expect(byNumber.get(5)).toHaveLength(4);
    const near = (n: number, expected: number) => expect(Math.abs(area(n) - expected)).toBeLessThan(4);
    near(1, 1134);
    near(2, 1458);
    near(3, 1944);
    near(4, 973.8);
    near(5, 486);
  });
});
