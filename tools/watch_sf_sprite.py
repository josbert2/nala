#!/usr/bin/env python3
"""Mira ~/Escritorio/Nala/sf-sprite-nala/ y cuando aparece una carpeta nueva
con metadata.json + spritesheet.png, la identifica por el texto del prompt
y la mete sola en la fila que corresponde de assets/sprites/v4/cat.json.

Carpetas que no matchean ninguna palabra clave se listan pero no se tocan,
para no adivinar mal y pisar algo.
"""
import json
import sys
import time
from pathlib import Path
from PIL import Image

CELL = 128
NALA_ROOT = Path(__file__).resolve().parent.parent
SHEET_PNG = NALA_ROOT / "assets/sprites/v4/cat.png"
SHEET_JSON = NALA_ROOT / "assets/sprites/v4/cat.json"
POLL_SECONDS = 3

# palabra clave en el prompt -> nombre de animacion en cat.json
KEYWORDS = {
    "breathing": "idle",
    "alert": "alert",
    "distance": "alert",
    "falling asleep": "amasar",
    "kneading": "amasar",
    "batting": "play",
    "stalking": "stalk",
    "crouching before pounce": "crouch",
    "pounce attack": "pounce",
    "rearing swat": "rear",
    "grooming": "groom",
    "loaf idle": "loaf",
    "being held up": "fall",
    "sleeping animation": "sleep",
    "typing": None,       # "trabajar": no existe fila todavia, se deja pendiente
    "slow blink": None,   # "beso de gato": no existe fila todavia, se deja pendiente
    "rolling over": None, # "panza arriba": no existe fila todavia, se deja pendiente
}


def match_animation(prompt: str):
    p = prompt.lower()
    for kw, anim in KEYWORDS.items():
        if kw in p:
            return anim
    return "UNKNOWN"


def inject(anim_name: str, spritesheet: Path, frame_count: int):
    meta = json.loads(SHEET_JSON.read_text())
    anim = meta["animations"][anim_name]
    row = anim["row"]

    src = Image.open(spritesheet).convert("RGBA")
    fw = src.width // frame_count
    fh = src.height

    sheet = Image.open(SHEET_PNG).convert("RGBA")
    sheet.paste((0, 0, 0, 0), (0, row * CELL, CELL * 8, (row + 1) * CELL))
    for i in range(frame_count):
        box = src.crop((i * fw, 0, (i + 1) * fw, fh))
        small = box.resize((CELL, CELL), Image.LANCZOS)
        sheet.paste(small, (i * CELL, row * CELL), small)
    sheet.save(SHEET_PNG)

    if anim["frames"] != frame_count:
        anim["frames"] = frame_count
        SHEET_JSON.write_text(json.dumps(meta, indent=2))


def main(folder: str):
    watch_dir = Path(folder).expanduser()
    # las que ya estan al arrancar se consideran ya resueltas (a mano);
    # solo reacciona a carpetas nuevas que aparezcan de aca en mas.
    seen = {p.name for p in watch_dir.iterdir() if p.is_dir()}
    print(f"[watch] mirando {watch_dir} cada {POLL_SECONDS}s (ignorando {len(seen)} carpetas ya existentes)")

    while True:
        for sub in sorted(p for p in watch_dir.iterdir() if p.is_dir()):
            if sub.name in seen:
                continue
            meta_path = sub / "metadata.json"
            sheet_path = sub / "spritesheet.png"
            if not (meta_path.exists() and sheet_path.exists()):
                continue

            meta = json.loads(meta_path.read_text())
            anim = match_animation(meta.get("prompt", ""))
            frame_count = meta.get("frame_count", 8)

            if anim == "UNKNOWN":
                print(f"[watch] {sub.name}: no reconozco de que accion es, la dejo para revisar a mano")
            elif anim is None:
                print(f"[watch] {sub.name}: es 'trabajar', esa fila todavia no existe en el motor, la dejo pendiente")
            else:
                inject(anim, sheet_path, frame_count)
                print(f"[watch] {sub.name} -> fila '{anim}' actualizada ({frame_count} frames)")

            seen.add(sub.name)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    default_dir = Path(__file__).resolve().parent.parent / "sf-sprite-nala"
    main(sys.argv[1] if len(sys.argv) > 1 else str(default_dir))
