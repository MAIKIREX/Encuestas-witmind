"""Centra las alternativas de la serie A a partir de la silueta completa.

La serie A combina cartuchos blancos, negros y tramados. Por ello detecta la
diferencia contra el fondo beige local, en vez de depender de píxeles claros u
oscuros del dibujo interior.
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "tmp" / "pdfs" / "raven-hi"
OUTPUT = ROOT / "tmp" / "raven-import-a-centered"
CENTERS_X = (468, 873, 1300)
TOP_Y = (808, 1029)
BOTTOM_Y = (2088, 2310)
HALF_WIDTH = 230
HALF_HEIGHT = 170
PADDING_X = 22
PADDING_TOP = 10
PADDING_BOTTOM = 22


def median(values: list[int]) -> int:
    values.sort()
    return values[len(values) // 2]


def find_tag(image: Image.Image, center_x: int, center_y: int):
    left = center_x - HALF_WIDTH
    top = center_y - HALF_HEIGHT
    right = center_x + HALF_WIDTH
    bottom = center_y + HALF_HEIGHT
    pixels = image.load()
    width, height = right - left, bottom - top
    border = (
        [pixels[left + x, top] for x in range(width)]
        + [pixels[left + x, bottom - 1] for x in range(width)]
        + [pixels[left, top + y] for y in range(height)]
        + [pixels[right - 1, top + y] for y in range(height)]
    )
    beige = tuple(median([color[channel] for color in border]) for channel in range(3))
    seen = bytearray(width * height)
    candidates: list[tuple[int, tuple[int, int, int, int]]] = []

    def differs_from_background(x: int, y: int) -> bool:
        red, green, blue = pixels[left + x, top + y]
        return abs(red - beige[0]) + abs(green - beige[1]) + abs(blue - beige[2]) > 75

    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if seen[offset] or not differs_from_background(x, y):
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
                    if not seen[next_offset] and differs_from_background(next_x, next_y):
                        seen[next_offset] = 1
                        queue.append((next_x, next_y))

            box = (left + min_x, top + min_y, left + max_x + 1, top + max_y + 1)
            box_width, box_height = box[2] - box[0], box[3] - box[1]
            box_center_x, box_center_y = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            distance = abs(box_center_x - center_x) + abs(box_center_y - center_y)
            if (
                count >= 8_000
                and 180 <= box_width <= 400
                and 140 <= box_height <= 300
                and 0.8 <= box_width / box_height <= 2.5
                and distance <= 190
            ):
                candidates.append((count - int(distance * 40), box))

    if candidates:
        return max(candidates, key=lambda candidate: candidate[0])[1]

    # En las alternativas con franjas negras, una franja del estímulo superior
    # puede unirse al cartucho durante la segmentación. La retícula impresa es
    # estable; este respaldo usa el rectángulo exterior completo del cartucho,
    # nunca el dibujo interior que causaba los cortes anteriores.
    columns = {468: (330, 630), 873: (730, 1025), 1300: (1155, 1458)}
    rows = {
        808: (668, 920),
        1029: (934, 1142),
        2088: (2033, 2240),
        2310: (2253, 2452),
    }
    left, right = columns[center_x]
    top, bottom = rows[center_y]
    return left, top, right, bottom


def crop_and_save(image: Image.Image, center_x: int, center_y: int, target: Path):
    # La retícula A es constante en las seis páginas. Esta caja exterior
    # calibrada evita que una matriz contigua se fusione al cartucho cuando la
    # alternativa contiene bandas, dameros o una superficie completamente negra.
    columns = {468: (330, 620), 873: (730, 1020), 1300: (1155, 1455)}
    rows = {
        808: (720, 900),
        1029: (937, 1120),
        2088: (2035, 2228),
        2310: (2255, 2440),
    }
    left, right = columns[center_x]
    top, bottom = rows[center_y]
    crop = image.crop(
        (
            max(0, left - PADDING_X),
            max(0, top - PADDING_TOP),
            min(image.width, right + PADDING_X),
            min(image.height, bottom + PADDING_BOTTOM),
        )
    )
    crop.save(target, "PNG", optimize=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for page_number in range(2, 8):
        with Image.open(PAGES / f"page-{page_number:02d}.png") as page:
            image = page.convert("RGB")
            first_item = (page_number - 2) * 2 + 1
            for item_number, rows in ((first_item, TOP_Y), (first_item + 1, BOTTOM_Y)):
                option_number = 1
                for center_y in rows:
                    for center_x in CENTERS_X:
                        crop_and_save(image, center_x, center_y, OUTPUT / f"A{item_number:02d}_opt_{option_number}.png")
                        option_number += 1
    count = len(list(OUTPUT.glob("A*_opt_*.png")))
    if count != 72:
        raise ValueError(f"Se esperaban 72 alternativas y se generaron {count}.")
    print(f"Generadas {count} alternativas centradas de la serie A en {OUTPUT}.")


if __name__ == "__main__":
    main()
