#!/usr/bin/env python3
"""
Busca animaciones congeladas o casi congeladas.

Existe porque `crouch` estuvo con los seis cuadros identicos sin que nadie lo
notara, y el cuerpo de `sacudirse` tampoco se movia.

La causa siempre es la misma: el movimiento se muestrea en N frames, con t en
0, 1/N, 2/N... Si se escribe sin(t*tau*k) con k multiplo de N, todos los frames
caen en la misma fase y la animacion queda quieta. Y con k alto pero no
multiplo, se ve muchisimo mas rapida de lo que uno espera.

Regla: k coprimo con N, y de preferencia 1 o 2.

    python3 tools/revisar_sprites.py
"""

import json
import os
import sys

from PIL import Image, ImageChops

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def revisar(look):
    d = os.path.join(RAIZ, "assets", "sprites", look)
    meta = json.load(open(os.path.join(d, "cat.json")))
    hoja = Image.open(os.path.join(d, "cat.png"))
    c = meta["cell"][0]

    malas = []
    for nombre, a in sorted(meta["animations"].items(), key=lambda kv: kv[1]["row"]):
        n = a["frames"]
        if n < 2:
            continue
        fr = [hoja.crop((i * c, a["row"] * c, i * c + c, a["row"] * c + c))
              for i in range(n)]
        rep = sum(1 for i in range(n)
                  if ImageChops.difference(fr[i], fr[(i + 1) % n]).getbbox() is None)
        if rep >= n - 1:
            malas.append((nombre, n, rep, "CONGELADA"))
        elif rep >= n // 2:
            malas.append((nombre, n, rep, "casi quieta"))
    return malas


todo = []
for look in sorted(os.listdir(os.path.join(RAIZ, "assets", "sprites"))):
    if not os.path.isdir(os.path.join(RAIZ, "assets", "sprites", look)):
        continue
    for nombre, n, rep, que in revisar(look):
        todo.append(f"  [{look}] {nombre}: {rep} de {n} cuadros repetidos — {que}")

if todo:
    print("animaciones que no se mueven:\n")
    print("\n".join(todo))
    print("\nrevisar los multiplicadores de frecuencia: sin(t*tau*k) con k")
    print("multiplo de la cantidad de frames deja todos los cuadros iguales.")
    sys.exit(1)

print("todas las animaciones se mueven.")
