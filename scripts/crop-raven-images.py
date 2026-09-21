"""Recorta las láminas y alternativas de las páginas renderizadas del Raven.

Requiere páginas 2–31 renderizadas a 220 DPI con pdftoppm. Las coordenadas
corresponden a la maquetación uniforme del cuadernillo autorizado.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "tmp" / "pdfs" / "raven-hi"
OUTPUT = ROOT / "raven-import"
SERIES = "ABCDE"

# En píxeles a 220 DPI; izquierda, arriba, derecha, abajo.
STEM = (510, 145, 1235, 700)
TOP_OPTION_ROWS = ((330, 716, 606, 900), (330, 938, 606, 1120))
BOTTOM_STEM = (510, 1464, 1235, 1980)
BOTTOM_OPTION_ROWS = ((330, 1996, 606, 2180), (330, 2218, 606, 2400))


def option_boxes(option_count: int, rows: tuple[tuple[int, int, int, int], ...]):
    columns = (
        ((330, 606), (734, 1012), (1162, 1438))
        if option_count == 6
        else ((308, 546), (612, 850), (936, 1166), (1240, 1448))
    )
    return [
        (left, top, right, bottom)
        for _, top, _, bottom in rows
        for left, right in columns
    ]


def code_at(index: int) -> str:
    return f"{SERIES[index // 12]}{index % 12 + 1:02d}"


def save_crop(image: Image.Image, box: tuple[int, int, int, int], target: Path):
    width, height = image.size
    scaled_box = (
        round(box[0] * width / 1820),
        round(box[1] * height / 2574),
        round(box[2] * width / 1820),
        round(box[3] * height / 2574),
    )
    crop = image.crop(scaled_box)
    crop.save(target, "PNG", optimize=True)


def process_item(image: Image.Image, index: int, is_bottom: bool):
    code = code_at(index)
    option_count = 6 if code[0] in "AB" else 8
    stem = BOTTOM_STEM if is_bottom else STEM
    rows = BOTTOM_OPTION_ROWS if is_bottom else TOP_OPTION_ROWS
    save_crop(image, stem, OUTPUT / f"{code}_stem.png")
    for option_number, box in enumerate(option_boxes(option_count, rows), start=1):
        save_crop(image, box, OUTPUT / f"{code}_opt_{option_number}.png")


def main():
    OUTPUT.mkdir(exist_ok=True)
    expected_pages = [PAGES / f"page-{page:02d}.png" for page in range(2, 32)]
    missing = [str(page) for page in expected_pages if not page.exists()]
    if missing:
        raise FileNotFoundError("Faltan páginas renderizadas:\n" + "\n".join(missing))

    for page_number, page_path in enumerate(expected_pages, start=2):
        with Image.open(page_path) as image:
            if abs(image.width - 1820) > 2 or abs(image.height - 2574) > 2:
                raise ValueError(f"{page_path.name} mide {image.size}; vuelve a renderizar a 220 DPI.")
            index = (page_number - 2) * 2
            process_item(image, index, False)
            process_item(image, index + 1, True)

    stems = list(OUTPUT.glob("[A-E][0-9][0-9]_stem.png"))
    options = list(OUTPUT.glob("[A-E][0-9][0-9]_opt_*.png"))
    if len(stems) != 60 or len(options) != 432:
        raise ValueError(f"Resultado incompleto: {len(stems)} láminas y {len(options)} alternativas.")
    print(f"Generadas {len(stems)} láminas y {len(options)} alternativas en {OUTPUT}.")


if __name__ == "__main__":
    main()
