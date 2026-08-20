#!/usr/bin/env python3
"""Mira una carpeta y pixela (recorta transparencia + nearest-neighbor a 48x48)
cada PNG nuevo que aparece, dejando el resultado en <carpeta>/listas/.
"""
import sys
import time
from pathlib import Path
from PIL import Image

SIZE = (48, 48)
GROUND_Y = 42       # linea de piso, igual que "ground" en cat.json
TOP_MARGIN = 2
POLL_SECONDS = 2
ALPHA_THRESHOLD = 40  # ignora el halo casi-transparente que deja el recorte de fondo


def pixelate(src_path: Path, out_path: Path):
    img = Image.open(src_path).convert("RGBA")
    alpha = img.getchannel("A").point(lambda a: 255 if a > ALPHA_THRESHOLD else 0)
    bbox = alpha.getbbox()
    if bbox:
        img = img.crop(bbox)

    w, h = img.size
    # escala UNIFORME (misma en x e y): si estirara cada eje distinto para
    # llenar el cuadro, el gato queda deformado cuando el recorte de origen
    # no tiene la misma proporcion de una imagen a otra.
    scale = min(SIZE[0] / w, (GROUND_Y - TOP_MARGIN) / h)
    new_w, new_h = max(1, round(w * scale)), max(1, round(h * scale))
    img = img.resize((new_w, new_h), Image.NEAREST)

    canvas = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    x = (SIZE[0] - new_w) // 2
    y = GROUND_Y - new_h  # patas apoyadas en la linea de piso
    canvas.paste(img, (x, y), img)

    out_path.parent.mkdir(exist_ok=True)
    canvas.save(out_path)


def main(folder: str):
    watch_dir = Path(folder).expanduser()
    out_dir = watch_dir / "listas"
    out_dir.mkdir(exist_ok=True)
    seen = set()

    print(f"[watch] mirando {watch_dir} cada {POLL_SECONDS}s")
    while True:
        for png in watch_dir.glob("*.png"):
            if png.parent == out_dir:
                continue
            out_path = out_dir / png.name
            if png.name in seen and out_path.exists():
                continue
            try:
                pixelate(png, out_path)
                seen.add(png.name)
                print(f"[watch] pixelado -> listas/{png.name}", flush=True)
            except Exception as e:
                print(f"[watch] error con {png.name}: {e}", flush=True)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    main(folder)
