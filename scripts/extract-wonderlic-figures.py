"""Extrae la geometria vectorial de las figuras del Wonderlic (items 38, 42, 49)
y recorta las laminas del item 7 desde el cuadernillo digital.

Salida en wonderlic-import/: figures.json (coordenadas) y PNG para test-media.
"""

import json
import math
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "docuemntacion" / "180. Wonderlick - Guia para examen del personal" / "wonderlic cuadernillo.pdf"
OUT = ROOT / "wonderlic-import"


def dots_and_edges(page, clip):
    dots, edges = [], []
    for d in page.get_drawings():
        r = d["rect"]
        if not fitz.Rect(clip).intersects(r):
            continue
        if any(it[0] == "c" for it in d["items"]) and 9 < r.width < 14 and 9 < r.height < 14:
            center = ((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
            if all(math.dist(center, other) > 3 for other in dots):
                dots.append(center)
        else:
            first = d["items"][0]
            if first[0] == "l":
                edges.append((first[1], first[2]))
    return dots, edges


def nearest(dots, p):
    return min(range(len(dots)), key=lambda i: math.dist(dots[i], (p.x, p.y)))


def ordered_polygon(page, clip, first_label_xy, second_label_xy):
    dots, edges = dots_and_edges(page, clip)
    adj = {i: set() for i in range(len(dots))}
    for a, b in edges:
        ax, ay, bx, by = a.x, a.y, b.x, b.y
        length2 = (bx - ax) ** 2 + (by - ay) ** 2
        if length2 < 1:
            continue
        on_edge = []
        for i, (x, y) in enumerate(dots):
            t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / length2
            dist = abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / math.sqrt(length2)
            margin = 8 / math.sqrt(length2)
            if -margin <= t <= 1 + margin and dist < 2.5:
                on_edge.append((t, i))
        on_edge.sort()
        for (_, i), (_, j) in zip(on_edge, on_edge[1:]):
            adj[i].add(j)
            adj[j].add(i)
    start = min(range(len(dots)), key=lambda i: math.dist(dots[i], first_label_xy))
    second = min(adj[start], key=lambda i: math.dist(dots[i], second_label_xy))
    order, prev, cur = [start], start, second
    while cur != start:
        if cur in order:
            raise RuntimeError('ciclo inesperado')
        order.append(cur)
        nxt = [n for n in adj[cur] if n != prev]
        prev, cur = cur, nxt[0]
    return [dots[i] for i in order], len(dots)


def figure_trace(page_no, clip, label1, label2):
    page = fitz.open(PDF)[page_no - 1]
    pts, total = ordered_polygon(page, clip, label1, label2)
    assert len(pts) == total, f"p{page_no}: polígono incompleto {len(pts)}/{total}"
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    pad = 26
    x0, y0 = min(xs) - pad, min(ys) - pad
    w, h = max(xs) - min(xs) + 2 * pad, max(ys) - min(ys) + 2 * pad
    return {
        "viewBox": [0, 0, round(w, 1), round(h, 1)],
        "points": [{"n": i + 1, "x": round(x - x0, 1), "y": round(y - y0, 1)} for i, (x, y) in enumerate(pts)],
    }





# ---------------------------------------------------------------------------
# Item 49: piezas (coordenadas en puntos PDF, tomadas de las figuras vectoriales
# de la pagina 9) y su normalizacion a una celda uniforme para dibujarlas con
# la misma escala relativa.
# ---------------------------------------------------------------------------
PIECES_49 = {
    1: [(171, 99.6), (108, 135.6), (171, 135.6)],
    2: [(207, 117.6), (234, 117.6), (234, 99.6), (261, 99.6), (261, 135.6), (207, 135.6)],
    3: [(297, 99.6), (351, 99.6), (351, 135.6), (297, 135.6)],
    4: [(387, 99.6), (441.1, 135.6), (387, 135.6)],
    5: [(477, 117.6), (504, 117.6), (504, 135.6), (477, 135.6)],
}
CELL = (80, 52)


def pieces_config():
    out = []
    for n, pts in PIECES_49.items():
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        ox = (CELL[0] - (max(xs) - min(xs))) / 2 - min(xs)
        oy = (CELL[1] - (max(ys) - min(ys))) / 2 - min(ys)
        norm = [(round(x + ox, 1), round(y + oy, 1)) for x, y in pts]
        out.append({"n": n, "points": [{"x": x, "y": y} for x, y in norm]})
    return {"cell": list(CELL), "pieces": out}


# ---------------------------------------------------------------------------
# Imagenes
# ---------------------------------------------------------------------------
DPI = 400
SCALE = DPI / 72


def render_clip(page, clip, canvas_pt, path):
    """Renderiza `clip` centrado sobre un lienzo blanco de canvas_pt (w, h)."""
    clip = fitz.Rect(clip)
    pix = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip, alpha=False)
    cw, ch = round(canvas_pt[0] * SCALE), round(canvas_pt[1] * SCALE)
    canvas = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, cw, ch), False)
    canvas.set_rect(canvas.irect, (255, 255, 255))
    dx, dy = (cw - pix.width) // 2, (ch - pix.height) // 2
    pix.set_origin(dx, dy)
    canvas.copy(pix, pix.irect)
    canvas.save(path)


def item7_images():
    doc = fitz.open(PDF)
    page = doc[1]
    # Quita los numeros impresos bajo cada figura (el boton ya lleva su insignia).
    page.add_redact_annot(fitz.Rect(50, 383, 600, 466))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    option_clips = {
        1: (185, 390, 262, 430),
        2: (276, 390, 342, 456),
        3: (357, 390, 420, 452),
        4: (420, 398, 512, 430),
        5: (519, 382, 584, 456),
    }
    d = OUT / "7"
    d.mkdir(parents=True, exist_ok=True)
    render_clip(page, (50, 384, 170, 446), (130, 74), d / "stem.png")
    for n, clip in option_clips.items():
        render_clip(page, clip, (96, 96), d / f"option-{n}.png")


def draw_fallback(path, size, draw):
    doc = fitz.open()
    w, h = size
    page = doc.new_page(width=w, height=h)
    shape = page.new_shape()
    draw(page, shape)
    shape.commit()
    page.get_pixmap(matrix=fitz.Matrix(SCALE / 1.4, SCALE / 1.4), alpha=False).save(path)


def trace_fallback(figure, path):
    pts = [(p["x"], p["y"]) for p in figure["points"]]
    w, h = figure["viewBox"][2], figure["viewBox"][3]

    def draw(page, shape):
        shape.draw_polyline(pts + [pts[0]])
        shape.finish(color=(0.1, 0.1, 0.1), fill=(0.97, 0.94, 0.9), width=1.2, closePath=True)
        cx, cy = sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts)
        for p in figure["points"]:
            shape.draw_circle((p["x"], p["y"]), 4)
            shape.finish(color=(0.1, 0.1, 0.1), fill=(0.1, 0.1, 0.1))
        shape.commit()
        for p in figure["points"]:
            dx, dy = p["x"] - cx, p["y"] - cy
            norm = math.hypot(dx, dy) or 1
            tx, ty = p["x"] + dx / norm * 11 - 4 * len(str(p["n"])), p["y"] + dy / norm * 11 + 3.5
            page.insert_text((tx, ty), str(p["n"]), fontsize=9, fontname="helv")

    draw_fallback(path, (w, h), draw)


def pieces_fallback(config, path):
    cw, ch = config["cell"]
    gap = 8
    n = len(config["pieces"])
    w, h = n * cw + (n + 1) * gap, ch + 2 * gap + 14

    def draw(page, shape):
        for i, piece in enumerate(config["pieces"]):
            ox = gap + i * (cw + gap)
            pts = [(ox + p["x"], gap + p["y"]) for p in piece["points"]]
            shape.draw_polyline(pts + [pts[0]])
            shape.finish(color=(0.1, 0.1, 0.1), fill=(0.97, 0.94, 0.9), width=1.2, closePath=True)
        shape.commit()
        for i, piece in enumerate(config["pieces"]):
            page.insert_text((gap + i * (cw + gap) + cw / 2 - 3, gap + ch + 11), str(piece["n"]), fontsize=10, fontname="helv")

    draw_fallback(path, (w, h), draw)


def build_all():
    OUT.mkdir(exist_ok=True)
    figures = json.loads((OUT / "figures.json").read_text())
    figures["49"] = pieces_config()
    (OUT / "figures.json").write_text(json.dumps(figures, indent=2))
    item7_images()
    for code in ("38", "42"):
        (OUT / code).mkdir(exist_ok=True)
        trace_fallback(figures[code], OUT / code / "stem.png")
    (OUT / "49").mkdir(exist_ok=True)
    pieces_fallback(figures["49"], OUT / "49" / "stem.png")
    print("imagenes generadas en", OUT)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    result = {
        "38": figure_trace(6, (215, 145, 425, 300), (224, 213), (252, 187)),
        "42": figure_trace(7, (195, 115, 435, 295), (205, 126), (242, 126)),
    }
    (OUT / "figures.json").write_text(json.dumps(result, indent=2))
    build_all()
