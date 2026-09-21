"""Reextrae las alternativas Raven usando sus contornos, no una cuadrícula fija.

Parte de las páginas 2-31 renderizadas a 220 DPI en ``tmp/pdfs/raven-hi`` y
escribe primero en ``tmp/raven-import-refined`` para permitir control de calidad
antes de sustituir los PNG de ``raven-import``.
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "tmp" / "pdfs" / "raven-hi"
OUTPUT = ROOT / "tmp" / "raven-import-refined"
SERIES = "ABCDE"

# Centros estimados a 220 DPI. Solo delimitan una zona de búsqueda amplia;
# el rectángulo final procede del contorno detectado.
TOP_Y = (808, 1029)
BOTTOM_Y = (2088, 2310)
CENTERS_6 = (468, 873, 1300)
CENTERS_8 = (427, 731, 1051, 1344)
SEARCH_HALF_WIDTH = 180
SEARCH_HALF_HEIGHT = 140
PADDING_X = 22
# Las páginas escaneadas conservan una sombra/línea de la fila anterior justo
# sobre algunos cartuchos. Se deja menos margen arriba y un margen mayor abajo
# para incluir la sombra propia de la alternativa.
PADDING_TOP = 10
PADDING_BOTTOM = 22


def code_at(index: int) -> str:
    return f"{SERIES[index // 12]}{index % 12 + 1:02d}"


def components(image: Image.Image, box: tuple[int, int, int, int], mode: str):
    """Devuelve componentes conectados claros u oscuros dentro de ``box``."""
    left, top, right, bottom = box
    pixels = image.load()
    width, height = right - left, bottom - top
    seen = bytearray(width * height)

    def is_foreground(x: int, y: int) -> bool:
        red, green, blue = pixels[left + x, top + y]
        if mode == "light":
            # El cartucho blanco se diferencia claramente del fondo beige.
            return max(red, green, blue) - min(red, green, blue) < 75 and red + green + blue > 590
        # Respaldo para alternativas negras: conserva su silueta, no solo el dibujo.
        return red + green + blue < 330

    found: list[tuple[int, tuple[int, int, int, int]]] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if seen[offset] or not is_foreground(x, y):
                continue

            seen[offset] = 1
            queue = deque([(x, y)])
            count = 0
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                current_x, current_y = queue.popleft()
                count += 1
                min_x, max_x = min(min_x, current_x), max(max_x, current_x)
                min_y, max_y = min(min_y, current_y), max(max_y, current_y)
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    next_offset = next_y * width + next_x
                    if not seen[next_offset] and is_foreground(next_x, next_y):
                        seen[next_offset] = 1
                        queue.append((next_x, next_y))

            if count >= 800:
                found.append((count, (left + min_x, top + min_y, left + max_x + 1, top + max_y + 1)))
    return found


def choose_component(candidates, center_x: int, center_y: int):
    eligible = []
    for pixels, box in candidates:
        left, top, right, bottom = box
        width, height = right - left, bottom - top
        ratio = width / height
        box_center_x, box_center_y = (left + right) / 2, (top + bottom) / 2
        distance = abs(box_center_x - center_x) + abs(box_center_y - center_y)
        if 110 <= width <= 340 and 80 <= height <= 230 and 0.8 <= ratio <= 3 and distance <= 180:
            # Favorece el cartucho completo y penaliza líneas divisorias cercanas.
            eligible.append((pixels - distance * 45, box))
    if not eligible:
        return None
    return max(eligible, key=lambda candidate: candidate[0])[1]


def crop_option(image: Image.Image, center_x: int, center_y: int):
    search = (
        center_x - SEARCH_HALF_WIDTH,
        center_y - SEARCH_HALF_HEIGHT,
        center_x + SEARCH_HALF_WIDTH,
        center_y + SEARCH_HALF_HEIGHT,
    )
    box = choose_component(components(image, search, "light"), center_x, center_y)
    if box is None:
        box = choose_component(components(image, search, "dark"), center_x, center_y)
    if box is None:
        raise ValueError(f"No se detectó una alternativa cerca de ({center_x}, {center_y}).")

    left, top, right, bottom = box
    crop_box = (
        max(0, left - PADDING_X),
        max(0, top - PADDING_TOP),
        min(image.width, right + PADDING_X),
        min(image.height, bottom + PADDING_BOTTOM),
    )
    return image.crop(crop_box), crop_box


def process_item(image: Image.Image, index: int, is_bottom: bool, manifest: list[str]):
    code = code_at(index)
    option_count = 6 if code[0] in "AB" else 8
    columns = CENTERS_6 if option_count == 6 else CENTERS_8
    rows = BOTTOM_Y if is_bottom else TOP_Y
    for number, (center_y, center_x) in enumerate(
        ((row, column) for row in rows for column in columns), start=1
    ):
        crop, crop_box = crop_option(image, center_x, center_y)
        name = f"{code}_opt_{number}.png"
        crop.save(OUTPUT / name, "PNG", optimize=True)
        manifest.append(f"{name},{crop_box[0]},{crop_box[1]},{crop_box[2]},{crop_box[3]}")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest: list[str] = ["file,left,top,right,bottom"]
    for page_number in range(2, 32):
        page_path = PAGES / f"page-{page_number:02d}.png"
        if not page_path.exists():
            raise FileNotFoundError(f"Falta {page_path}.")
        with Image.open(page_path) as image:
            image = image.convert("RGB")
            index = (page_number - 2) * 2
            process_item(image, index, False, manifest)
            process_item(image, index + 1, True, manifest)

    expected = 432
    actual = len(list(OUTPUT.glob("*_opt_*.png")))
    if actual != expected:
        raise ValueError(f"Se esperaban {expected} alternativas y se generaron {actual}.")
    (OUTPUT / "manifest.csv").write_text("\n".join(manifest) + "\n", encoding="utf-8")
    print(f"Generadas {actual} alternativas refinadas en {OUTPUT}.")


if __name__ == "__main__":
    main()
