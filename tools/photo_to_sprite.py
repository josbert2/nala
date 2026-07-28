#!/usr/bin/env python3
"""
Convierte una foto de ella en un sprite pixel-art.

Pipeline:
  1. saca el fondo (flood fill desde los bordes, o un color que le indiques)
  2. recorta a la silueta
  3. baja de resolucion con buen filtro
  4. reduce a pocos colores (pixel art de verdad, no una foto chiquita)
  5. opcional: le pone contorno oscuro de 1px

Uso:
    python3 tools/photo_to_sprite.py fotos/sentada.jpg --name sit
    python3 tools/photo_to_sprite.py fotos/sentada.png --name sit --bg "#ffffff" --tol 40
    python3 tools/photo_to_sprite.py fotos/durmiendo.jpg --name sleep --height 30 --colors 10

Si la foto ya viene recortada con transparencia (PNG con alpha), usá --keep-alpha
y salteamos el paso 1, que es el unico que puede salir mal.

Cada sprite sale a assets/poses/<name>.png. Cuando tengas varias poses:
    python3 tools/pack_poses.py
las junta en el spritesheet que usa la app.
"""

import argparse
import colorsys
import json
import os
from collections import deque

from PIL import Image, ImageEnhance

CELL = 48
DEFAULT_HEIGHT = 34     # alto del bicho dentro de la celda de 48px


# ------------------------------------------------------------------ recortar


def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def strip_background(im, bg_color, tol):
    """
    Flood fill desde los 4 bordes: todo lo que sea parecido al fondo y este
    conectado al borde se vuelve transparente. Respeta al bicho aunque tenga
    colores parecidos al fondo, siempre que no toque el borde.
    """
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    tol2 = tol * tol * 3

    seeds = []
    for x in range(w):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(h):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    if bg_color is None:
        # Color de fondo = promedio del marco exterior.
        r = g = b = n = 0
        for (x, y) in seeds:
            c = px[x, y]
            r += c[0]; g += c[1]; b += c[2]; n += 1
        bg_color = (r // n, g // n, b // n)

    seen = bytearray(w * h)
    q = deque()
    for (x, y) in seeds:
        i = y * w + x
        if seen[i]:
            continue
        if dist2(px[x, y], bg_color) <= tol2:
            seen[i] = 1
            q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            i = ny * w + nx
            if seen[i]:
                continue
            c = px[nx, ny]
            if c[3] and dist2(c, bg_color) <= tol2:
                seen[i] = 1
                q.append((nx, ny))

    return im


def autocrop(im):
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


# ------------------------------------------------------------------ pixelar


def pixelate(im, target_h, colors, saturate):
    w, h = im.size
    target_w = max(1, round(w * target_h / h))

    if saturate != 1.0:
        rgb = ImageEnhance.Color(im.convert("RGB")).enhance(saturate)
        im = Image.merge("RGBA", (*rgb.split(), im.split()[3]))

    small = im.resize((target_w, target_h), Image.LANCZOS)

    # Alpha binario: el pixel art no tiene bordes semitransparentes.
    alpha = small.split()[3].point(lambda a: 255 if a > 110 else 0)

    # Cuantizar solo el RGB, con el alpha aplicado para no contaminar con fondo.
    rgb = small.convert("RGB")
    q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    out = q.convert("RGBA")
    out.putalpha(alpha)
    return out


def snap_to_palette(im, roles):
    """Empuja cada pixel al color mas cercano de la paleta de la app."""
    pal = []
    for k in ("base", "dark", "light", "pink", "eye", "outline"):
        hx = roles.get(k)
        if hx:
            pal.append(tuple(int(hx.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)))
    if not pal:
        return im
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] == 0:
                continue
            best = min(pal, key=lambda p: dist2(c, p))
            px[x, y] = (*best, 255)
    return im


def add_outline(im, hex_color):
    color = (*[int(hex_color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)], 255)
    im = im.crop((-1, -1, im.width + 1, im.height + 1))
    px = im.load()
    out = im.copy()
    op = out.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < im.width and 0 <= ny < im.height and px[nx, ny][3]:
                    op[x, y] = color
                    break
    return out


# --------------------------------------------------------------------- main


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser()
    ap.add_argument("photo")
    ap.add_argument("--name", required=True, help="nombre de la pose: sit, sleep, walk1...")
    ap.add_argument("--height", type=int, default=DEFAULT_HEIGHT, help="alto en pixels del sprite")
    ap.add_argument("--colors", type=int, default=12)
    ap.add_argument("--bg", help="color de fondo en hex; por defecto lo adivina del marco")
    ap.add_argument("--tol", type=int, default=32, help="tolerancia del fondo (subila si queda fondo)")
    ap.add_argument("--keep-alpha", action="store_true", help="la foto ya viene recortada")
    ap.add_argument("--saturate", type=float, default=1.15)
    ap.add_argument("--snap", action="store_true", help="forzar la paleta de config/palette.json")
    ap.add_argument("--no-outline", action="store_true")
    a = ap.parse_args()

    im = Image.open(a.photo).convert("RGBA")
    print(f"entrada: {a.photo}  {im.width}x{im.height}")

    if not a.keep_alpha:
        bg = tuple(int(a.bg.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) if a.bg else None
        im = strip_background(im, bg, a.tol)
        opaque = sum(1 for p in im.getdata() if p[3])
        print(f"fondo sacado: queda {opaque / (im.width * im.height):.0%} de la imagen")

    im = autocrop(im)
    im = pixelate(im, a.height, a.colors, a.saturate)

    roles = {}
    pal_path = os.path.join(root, "config/palette.json")
    if os.path.exists(pal_path):
        roles = json.load(open(pal_path)).get("roles", {})
    if a.snap and roles:
        im = snap_to_palette(im, roles)
    if not a.no_outline:
        im = add_outline(im, roles.get("outline", "#2b2118"))

    # Centrar en la celda, apoyada en la linea del piso.
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x = (CELL - im.width) // 2
    y = 42 - im.height           # GROUND del generador de sprites
    cell.paste(im, (x, max(0, y)), im)

    out_dir = os.path.join(root, "assets/poses")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"{a.name}.png")
    cell.save(out)

    prev = os.path.join(out_dir, f"{a.name}.preview.png")
    bgim = Image.new("RGBA", cell.size, (245, 240, 235, 255))
    bgim.alpha_composite(cell)
    bgim.resize((CELL * 8, CELL * 8), Image.NEAREST).save(prev)

    print(f"sprite  -> {out}   ({im.width}x{im.height} px reales)")
    print(f"preview -> {prev}")


if __name__ == "__main__":
    main()
