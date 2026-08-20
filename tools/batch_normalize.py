#!/usr/bin/env python3
"""Pixela una carpeta entera de frames dejandolos EXACTAMENTE del mismo alto.

A diferencia de watch_pixelate.py, que ademas limita por ANCHO para que entre
en el lienzo de 48px (y por eso una cola mas ancha en un frame achicaba el
gato entero para que entrara), esto escala SOLO por altura. Si algo se pasa
de ancho, se recorta centrado en vez de encoger todo el gato.
"""
import sys
from pathlib import Path
from PIL import Image

SIZE = (48, 48)
GROUND_Y = 42
TOP_MARGIN = 2
TARGET_H = GROUND_Y - TOP_MARGIN


ALPHA_THRESHOLD = 40  # ignora el halo casi-transparente que deja el recorte de fondo


def trimmed(img):
    alpha = img.getchannel("A").point(lambda a: 255 if a > ALPHA_THRESHOLD else 0)
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def place(img):
    w, h = img.size
    scale = TARGET_H / h
    new_w, new_h = max(1, round(w * scale)), max(1, round(h * scale))
    resized = img.resize((new_w, new_h), Image.NEAREST)

    canvas = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    x = (SIZE[0] - new_w) // 2
    y = GROUND_Y - new_h

    if new_w > SIZE[0]:
        # se paso de ancho (cola muy abierta): recorto centrado, no achico el gato
        crop_x = (new_w - SIZE[0]) // 2
        resized = resized.crop((crop_x, 0, crop_x + SIZE[0], new_h))
        x = 0

    canvas.paste(resized, (x, y), resized)
    return canvas


def main(folder: str):
    src_dir = Path(folder).expanduser()
    out_dir = src_dir / "normalizado"
    out_dir.mkdir(exist_ok=True)

    files = sorted(p for p in src_dir.glob("*.png") if p.parent == src_dir)
    if not files:
        print("no encontre pngs en", src_dir)
        return

    for f in files:
        img = trimmed(Image.open(f).convert("RGBA"))
        out = place(img)
        out.save(out_dir / f.name)
        bbox = out.getbbox()
        w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1]
        print(f"{f.name}: {w}x{h}")

    print("listo en", out_dir)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
