import type { TracePoint } from "@/lib/supabase/types";

export type Pt = { x: number; y: number };

export function polygonArea(points: Pt[]) {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += p.x * q.y - q.x * p.y;
  });
  return Math.abs(sum) / 2;
}

function cross(o: Pt, a: Pt, b: Pt) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}

// Un poligono "simple" no se cruza consigo mismo: valida que los puntos se
// extrajeron en el orden correcto del contorno.
export function isSimplePolygon(points: Pt[]) {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Verificador exacto para figuras "poliomino" (item 42): todas las aristas son
// horizontales/verticales de largo igual a la celda. Corta por una cuerda y
// comprueba si las dos partes se reacomodan en un cuadrado.
// ---------------------------------------------------------------------------

type Cell = readonly [number, number];
const key = (c: Cell) => `${c[0]},${c[1]}`;

function inside(px: number, py: number, poly: Cell[]) {
  let hit = false;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    if (y1 > py !== y2 > py && px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1) hit = !hit;
  }
  return hit;
}

export function toLattice(points: TracePoint[]) {
  const unit = Math.min(
    ...points.map((p, i) => {
      const q = points[(i + 1) % points.length];
      return Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
    }),
  );
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const vertex = new Map<number, Cell>(
    points.map((p) => [p.n, [Math.round((p.x - minX) / unit), Math.round((p.y - minY) / unit)] as Cell]),
  );
  const ring = points.map((p) => vertex.get(p.n)!);
  const width = Math.max(...ring.map((c) => c[0]));
  const height = Math.max(...ring.map((c) => c[1]));
  const cells = new Map<string, Cell>();
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      if (inside(i + 0.5, j + 0.5, ring)) cells.set(key([i, j]), [i, j]);
    }
  }
  return { vertex, cells };
}

export function blockedEdges(a: Cell, b: Cell) {
  const blocked = new Set<string>();
  const edge = (c1: Cell, c2: Cell) => blocked.add([key(c1), key(c2)].sort().join("|"));
  if (a[0] === b[0]) {
    const [lo, hi] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
    for (let j = lo; j < hi; j++) edge([a[0] - 1, j], [a[0], j]);
    return blocked;
  }
  if (a[1] === b[1]) {
    const [lo, hi] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
    for (let i = lo; i < hi; i++) edge([i, a[1] - 1], [i, a[1]]);
    return blocked;
  }
  return null;
}

export function components(cells: Map<string, Cell>, blocked: Set<string>) {
  const seen = new Set<string>();
  const result: Cell[][] = [];
  for (const [k, start] of cells) {
    if (seen.has(k)) continue;
    const comp: Cell[] = [];
    const stack = [start];
    seen.add(k);
    while (stack.length) {
      const c = stack.pop()!;
      comp.push(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n: Cell = [c[0] + dx, c[1] + dy];
        const nk = key(n);
        if (!cells.has(nk) || seen.has(nk)) continue;
        if (blocked.has([key(c), nk].sort().join("|"))) continue;
        seen.add(nk);
        stack.push(n);
      }
    }
    result.push(comp);
  }
  return result;
}

export function normalise(cells: Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map((c) => [c[0] - mx, c[1] - my] as Cell);
}

export function rotations(cells: Cell[]) {
  const out: Cell[][] = [];
  let cur = cells;
  for (let r = 0; r < 4; r++) {
    cur = normalise(cur.map(([x, y]) => [-y, x] as Cell));
    out.push(cur);
  }
  return out;
}

export function tilesSquare(a: Cell[], b: Cell[], side: number) {
  const aKeys = new Set(a.map(key));
  for (const orient of rotations(b)) {
    for (let dx = -side; dx <= side; dx++) {
      for (let dy = -side; dy <= side; dy++) {
        const moved = orient.map(([x, y]) => [x + dx, y + dy] as Cell);
        const keys = moved.map(key);
        if (keys.some((k) => aKeys.has(k))) continue;
        const union = new Set([...aKeys, ...keys]);
        if (union.size !== side * side) continue;
        let fits = true;
        for (let i = 0; i < side && fits; i++) {
          for (let j = 0; j < side; j++) {
            if (!union.has(key([i, j]))) {
              fits = false;
              break;
            }
          }
        }
        if (fits) return true;
      }
    }
  }
  return false;
}

// Devuelve todos los pares de puntos cuyo corte rectilineo, hecho por el
// interior de la figura, divide la figura en dos partes que forman un cuadrado.
export function squareCuts(points: TracePoint[]) {
  const { vertex, cells } = toLattice(points);
  const side = Math.round(Math.sqrt(cells.size));
  if (side * side !== cells.size) return [] as [number, number][];

  const found: [number, number][] = [];
  const numbers = points.map((p) => p.n).sort((a, b) => a - b);
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const blocked = blockedEdges(vertex.get(numbers[i])!, vertex.get(numbers[j])!);
      if (!blocked) continue;
      const interior = [...blocked].every((e) => e.split("|").every((k) => cells.has(k)));
      if (!interior) continue;
      const parts = components(cells, blocked);
      if (parts.length !== 2) continue;
      // La parte que ocupa la esquina del cuadrado queda anclada en el origen:
      // se prueba con cada una de las dos partes en ese rol.
      const [first, second] = parts;
      const forms =
        rotations(first).some((a) => tilesSquare(a, second, side)) ||
        rotations(second).some((a) => tilesSquare(a, first, side));
      if (forms) found.push([numbers[i], numbers[j]]);
    }
  }
  return found;
}
