"""Crea hojas de contacto temporales para revisar las alternativas Raven."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "raven-import-refined"
OUTPUT = ROOT / "tmp" / "raven-contact-sheets"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for series, option_count in (("A", 6), ("B", 6), ("C", 8), ("D", 8), ("E", 8)):
        tile_width, tile_height = 142, 112
        label_height, gap = 20, 8
        width = option_count * (tile_width + gap) + gap
        height = 12 * (tile_height + label_height + gap) + gap
        sheet = Image.new("RGB", (width, height), "#f7f5f0")
        draw = ImageDraw.Draw(sheet)
        for item_number in range(1, 13):
            y = gap + (item_number - 1) * (tile_height + label_height + gap)
            draw.text((gap, y), f"{series}{item_number:02d}", fill="#111111")
            for option_number in range(1, option_count + 1):
                source = SOURCE / f"{series}{item_number:02d}_opt_{option_number}.png"
                with Image.open(source).convert("RGB") as option:
                    option.thumbnail((tile_width, tile_height))
                    x = gap + (option_number - 1) * (tile_width + gap)
                    offset_x = x + (tile_width - option.width) // 2
                    offset_y = y + label_height + (tile_height - option.height) // 2
                    sheet.paste(option, (offset_x, offset_y))
                draw.text((x, y), str(option_number), fill="#555555")
        sheet.save(OUTPUT / f"serie-{series}.png", "PNG", optimize=True)
    print(f"Hojas de contacto creadas en {OUTPUT}.")


if __name__ == "__main__":
    main()
