#!/usr/bin/env python3
"""
Arma un cuarto para Nala a partir del pack Modern Interiors de LimeZu.

IMPORTANTE — LICENCIA
El pack no se puede redistribuir, asi que sus imagenes NO van al repo. Este
script las recorta desde TU copia del zip y las deja en tu carpeta de usuario
(~/.config/Nala/rooms/), que esta fuera de git. Si no tenes el pack, la app
funciona igual: simplemente no hay cuarto.

    Pack: https://limezu.itch.io/moderninteriors
    La version libre es solo para uso no comercial.

Uso:
    python3 tools/import_room.py ~/Descargas/Modern_Interiors_Free_v2.2.zip
    python3 tools/import_room.py <carpeta ya descomprimida>
    python3 tools/import_room.py <zip> --preview
"""

import argparse
import json
import os
import shutil
import tempfile
import zipfile

from PIL import Image

# Donde caen las piezas del Room Builder de 32x32. Medido sobre el sheet: los
# bloques se repiten cada 64 px, tanto las paredes como los pisos.
RB = "Room_Builder_free_32x32.png"

WALL_X, WALL_W = 2, 64      # x=2 esquiva el borde de la grilla del sheet;
                            # 64 son dos tiles, que es el periodo de los patrones
WALL_Y0, WALL_H = 172, 50   # el primero arranca aca; abajo trae su zocalo
WALL_STEP = 64

FLOOR_X, FLOOR_W = 352, 64  # dos tiles: cubre el periodo de todos los patrones
FLOOR_Y0, FLOOR_H = 160, 64
FLOOR_STEP = 64

PAREDES = ["salmon", "amarilla", "menta", "madera", "nogal", "ladrillo", "azul", "beige"]
PISOS = ["ladrillo", "amarillo", "menta", "gris", "espiga"]


def find_sheet(root, name):
    for dirpath, _dirs, files in os.walk(root):
        if name in files:
            return os.path.join(dirpath, name)
    return None


def cut(sheet, x, y, w, h):
    piece = sheet.crop((x, y, x + w, y + h))
    return piece if piece.getbbox() else None


def build(src, out_dir, preview=False):
    tmp = None
    if os.path.isfile(src) and src.lower().endswith(".zip"):
        tmp = tempfile.mkdtemp(prefix="nala-room-")
        with zipfile.ZipFile(src) as z:
            z.extractall(tmp)
        root = tmp
    else:
        root = src

    path = find_sheet(root, RB)
    if not path:
        raise SystemExit(f"no encontre {RB} adentro de {src}")
    print(f"sheet: {path}")

    sheet = Image.open(path).convert("RGBA")
    os.makedirs(out_dir, exist_ok=True)

    manifest = {
        "fuente": "Modern Interiors (free) — LimeZu — https://limezu.itch.io/moderninteriors",
        "licencia": "solo uso no comercial; no redistribuir",
        "tile": 32,
        "paredes": [],
        "pisos": []
    }

    for i, nombre in enumerate(PAREDES):
        p = cut(sheet, WALL_X, WALL_Y0 + i * WALL_STEP, WALL_W, WALL_H)
        if not p:
            continue
        f = f"pared_{nombre}.png"
        p.save(os.path.join(out_dir, f))
        manifest["paredes"].append({"id": nombre, "file": f,
                                    "w": p.width, "h": p.height})

    for i, nombre in enumerate(PISOS):
        p = cut(sheet, FLOOR_X, FLOOR_Y0 + i * FLOOR_STEP, FLOOR_W, FLOOR_H)
        if not p:
            continue
        f = f"piso_{nombre}.png"
        p.save(os.path.join(out_dir, f))
        manifest["pisos"].append({"id": nombre, "file": f,
                                  "w": p.width, "h": p.height})

    with open(os.path.join(out_dir, "room.json"), "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"paredes: {len(manifest['paredes'])}  pisos: {len(manifest['pisos'])}")
    print(f"salida : {out_dir}")

    if preview:
        make_preview(out_dir, manifest)

    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)


def make_preview(out_dir, manifest):
    """Una tira con cada combinacion, para elegir."""
    W, H = 420, 150
    filas = []
    for pared in manifest["paredes"]:
        wp = Image.open(os.path.join(out_dir, pared["file"])).convert("RGBA")
        for piso in manifest["pisos"][:1]:
            fp = Image.open(os.path.join(out_dir, piso["file"])).convert("RGBA")
            fila = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            fh = 56
            for y in range(H - fh - wp.height, -wp.height, -wp.height):
                for x in range(0, W, wp.width):
                    fila.paste(wp, (x, y), wp)
            for x in range(0, W, fp.width):
                fila.paste(fp, (x, H - fh), fp)
            filas.append((f"{pared['id']} + {piso['id']}", fila))

    out = Image.new("RGBA", (W, (H + 6) * len(filas)), (36, 36, 46, 255))
    for i, (_n, f) in enumerate(filas):
        out.alpha_composite(f, (0, i * (H + 6)))
    p = os.path.join(out_dir, "preview.png")
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(p)
    print("preview:", p)
    for n, _f in filas:
        print("  ", n)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pack", help="el zip del pack, o la carpeta descomprimida")
    ap.add_argument("--out", default=os.path.expanduser("~/.config/Nala/rooms/moderno"))
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    build(a.pack, a.out, a.preview)
