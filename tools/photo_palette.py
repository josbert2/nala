#!/usr/bin/env python3
"""
Extrae la paleta de su pelaje a partir de fotos reales.

Toma una o varias fotos, saca los colores dominantes y los mapea a los roles
que usa el generador de sprites (base / dark / light / outline / eye / pink).
El resultado va a config/palette.json y despues:

    python3 tools/make_sprites.py

regenera la hoja de sprites con SUS colores.

Uso:
    python3 tools/photo_palette.py fotos/*.jpg
    python3 tools/photo_palette.py fotos/gata.jpg --crop 0.3,0.2,0.7,0.8
    python3 tools/photo_palette.py fotos/gata.jpg --eye "#c8a12a"
    python3 tools/photo_palette.py fotos/*.jpg --preview

--crop recorta la zona del pelaje (x1,y1,x2,y2 en fracciones 0..1). Sirve para
sacar el fondo de encima sin necesidad de recortar la foto a mano.
"""

import argparse
import colorsys
import json
import os

from PIL import Image

MAX_SIDE = 220        # las fotos se achican antes de analizar
N_CLUSTERS = 12


def load_pixels(paths, crop):
    pixels = []
    for p in paths:
        try:
            im = Image.open(p).convert("RGB")
        except Exception as e:
            print(f"  ! salteo {p}: {e}")
            continue

        if crop:
            x1, y1, x2, y2 = crop
            w, h = im.size
            im = im.crop((int(x1 * w), int(y1 * h), int(x2 * w), int(y2 * h)))

        im.thumbnail((MAX_SIDE, MAX_SIDE))
        pixels.extend(im.getdata())
        print(f"  + {os.path.basename(p)}  ({im.width}x{im.height})")
    return pixels


def cluster(pixels, n=N_CLUSTERS):
    """Cuantizacion adaptativa via Pillow, ordenada por frecuencia."""
    im = Image.new("RGB", (len(pixels), 1))
    im.putdata(pixels)
    q = im.quantize(colors=n, method=Image.MEDIANCUT)
    pal = q.getpalette()[: n * 3]
    counts = {}
    for idx in q.getdata():
        counts[idx] = counts.get(idx, 0) + 1

    out = []
    total = len(pixels)
    for idx, cnt in sorted(counts.items(), key=lambda kv: -kv[1]):
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        out.append({"rgb": rgb, "share": cnt / total})
    return out


def lum(rgb):
    r, g, b = [c / 255 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def sat(rgb):
    r, g, b = [c / 255 for c in rgb]
    return colorsys.rgb_to_hsv(r, g, b)[1]


def shift(rgb, factor, sat_mul=1.0):
    """Aclara u oscurece manteniendo el tinte."""
    r, g, b = [c / 255 for c in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    v = max(0.0, min(1.0, v * factor))
    s = max(0.0, min(1.0, s * sat_mul))
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))


def hexs(rgb):
    return "#%02x%02x%02x" % rgb


def build_roles(clusters, eye_override):
    # Descarto los grises casi puros de fondo solo si hay alternativas.
    body = [c for c in clusters if 0.08 < lum(c["rgb"]) < 0.92]
    if len(body) < 3:
        body = clusters

    base = body[0]["rgb"]

    # dark: el cluster oscuro mas frecuente que sea claramente mas oscuro.
    darks = [c["rgb"] for c in body if lum(c["rgb"]) < lum(base) - 0.10]
    dark = darks[0] if darks else shift(base, 0.68, 1.05)

    # light: el cluster claro mas frecuente (pecho, panza).
    lights = [c["rgb"] for c in body if lum(c["rgb"]) > lum(base) + 0.14]
    light = lights[0] if lights else shift(base, 1.45, 0.6)

    outline = shift(dark, 0.42, 1.1)

    if eye_override:
        eye = eye_override
    else:
        # El ojo suele ser el color mas saturado y poco frecuente.
        cands = sorted(
            [c for c in clusters if c["share"] < 0.12 and sat(c["rgb"]) > 0.30],
            key=lambda c: -sat(c["rgb"]),
        )
        eye = cands[0]["rgb"] if cands else (143, 191, 112)

    # Nariz/orejas: rosa derivado del tono de la base, nunca del fondo.
    pink = shift((224, 149, 155), 1.0, 0.9)

    return {
        "outline": hexs(outline),
        "base": hexs(base),
        "dark": hexs(dark),
        "light": hexs(light),
        "pink": hexs(pink),
        "eye": hexs(eye),
    }


def preview(roles, clusters, path):
    sw = 64
    im = Image.new("RGB", (sw * len(roles), sw * 2), (255, 255, 255))
    for i, (name, hx) in enumerate(roles.items()):
        rgb = tuple(int(hx[j:j + 2], 16) for j in (1, 3, 5))
        im.paste(Image.new("RGB", (sw, sw), rgb), (i * sw, 0))
    for i, c in enumerate(clusters[: len(roles)]):
        im.paste(Image.new("RGB", (sw, sw), tuple(c["rgb"])), (i * sw, sw))
    im.save(path)
    print(f"preview -> {path}  (arriba: roles, abajo: clusters crudos)")


def parse_hex(s):
    if not s:
        return None
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser()
    ap.add_argument("photos", nargs="+")
    ap.add_argument("--crop", help="x1,y1,x2,y2 en fracciones 0..1")
    ap.add_argument("--eye", help="color de ojos en hex, ej '#c8a12a'")
    ap.add_argument("--out", default=os.path.join(root, "config/palette.json"))
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()

    crop = tuple(float(v) for v in a.crop.split(",")) if a.crop else None

    print("leyendo fotos:")
    pixels = load_pixels(a.photos, crop)
    if not pixels:
        raise SystemExit("no pude leer ninguna foto")

    clusters = cluster(pixels)
    roles = build_roles(clusters, parse_hex(a.eye))

    print("\npaleta:")
    for k, v in roles.items():
        print(f"  {k:8} {v}")

    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w") as f:
        json.dump({"roles": roles, "source": a.photos}, f, indent=2)
    print(f"\nguardado -> {a.out}")
    print("ahora corré:  python3 tools/make_sprites.py")

    if a.preview:
        preview(roles, clusters, os.path.join(root, "assets/palette-preview.png"))


if __name__ == "__main__":
    main()
