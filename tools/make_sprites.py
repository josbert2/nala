#!/usr/bin/env python3
"""
Generador parametrico de sprites de gata.

Dibuja una hoja de sprites pixel-art (una fila por animacion) a partir de una
paleta de colores. La paleta se puede extraer de fotos reales con
tools/photo_palette.py, asi el sprite queda con SU pelaje.

Hay mas de una version de su pinta (ver LOOKS). Cada una sale a su propia
carpeta, assets/sprites/<id>/, y se elige desde el menu de bandeja. Ademas se
escribe assets/sprites/looks.json, que es de donde la app saca la lista.

Uso:
    python3 tools/make_sprites.py                  # todas las versiones
    python3 tools/make_sprites.py --look v2        # solo una
    python3 tools/make_sprites.py --palette config/palette.json
"""

import argparse
import json
import math
import os

from PIL import Image, ImageDraw

CELL = 48          # tamano de cada celda del spritesheet
GROUND = 42        # linea del piso dentro de la celda (donde apoyan las patas)

# Sacada de sus fotos: blanca de pelo largo, gorro gris tabby en la cabeza,
# blaze blanco al medio de la frente, nariz rosa, ojos verde oliva.
DEFAULT_PALETTE = {
    "outline": "#4b423a",
    "base":    "#ebe5dc",   # cuerpo, blanco cremoso
    "dark":    "#a89f95",   # el gris de la cabeza y la cola
    "light":   "#fdfcf9",   # pecho, patas, blaze
    "pink":    "#e8a5a4",   # nariz y orejas
    "eye":     "#9aa85e",   # verde oliva
    # Roles que trajo la v2. En la v1 apuntan a los de siempre, asi sigue
    # saliendo exactamente igual que antes.
    "deep":    "#a89f95",
    "pupil":   "#4b423a",
}

# Medida sobre las fotos de su Instagram, corrigiendo la luz calida del cuarto
# con el blanco de su hocico como referencia. Sale mas tibia que la v1: el
# gorro es un taupe marronoso y no un gris neutro, y los ojos son oliva caqui
# apagado, no verde.
#
# Ella es blanca entera: el gris es SOLO el gorro de la cabeza y la cola. El
# lomo, el pecho, la panza y las patas van blancos.
PALETTE_V2 = {
    "outline": "#463a30",   # marron oscuro, mas calido
    "base":    "#ece5d8",   # su blanco, que de cerca es crema
    "light":   "#fbf8f2",   # blaze, pecho, patitas
    "dark":    "#8d8178",   # el taupe del gorro y de la cola
    "deep":    "#5d5149",   # el tabby oscuro del centro del gorro
    "pink":    "#dd9b88",   # nariz salmon y orejas
    "eye":     "#a7a36b",   # oliva caqui
    "pupil":   "#0d1119",   # pupila casi negra
}

# Sus versiones. `marks` prende los rasgos que dibuja de mas cada una: son
# todos opt-in, asi que agregar una version nueva no toca a las anteriores.
LOOKS = [
    {
        "id": "v1",
        "label": "v1",
        "palette": DEFAULT_PALETTE,
        "eyes": "normal",
        "marks": {},
    },
    {
        "id": "v2",
        "label": "v2",
        "palette": PALETTE_V2,
        "eyes": "normal",
        "marks": {
            "tabby": True,     # el gorro en dos tonos, partido por el blaze
            "eyeRing": True,   # iris con delineado y pupila grande
        },
    },
    {
        # La corregida contra sus fotos: el gris de un solo lado (SU izquierda,
        # que de frente cae a la derecha) y por encima del ojo, no tapandolo, y
        # los ojos mas chicos y juntos.
        "id": "v3",
        "label": "v3",
        "palette": PALETTE_V2,
        "eyes": "small",
        "marks": {
            "tabby": True,
            "eyeRing": True,
            "sideCap": True,   # el parche de un solo lado en vez del gorro cruzado
        },
    },
]

DEFAULT_LOOK = "v3"

# La arena de su arenero y el plastico de la bandeja.
SAND    = (222, 205, 176, 255)
SAND_HI = (238, 226, 203, 255)
SAND_SH = (192, 173, 143, 255)
TRAY    = (126, 138, 152, 255)
TRAY_HI = (156, 168, 181, 255)
TRAY_SH = (94, 104, 118, 255)

# Los rasgos del look que se esta dibujando ahora mismo. Es global a proposito:
# si no, habria que pasarle un parametro mas a las dieciseis poses solo para que
# se lo reenvien a head().
MARKS = {}

# Donde quedaron los ojos del frame que se esta dibujando. El motor los usa
# para pintar el iris y la pupila el mismo, y asi poder moverle la mirada sin
# tener que pre-renderizar una version por direccion.
EYE_MARKS = []

# Con que medidas pinta el motor cada ojo, en pixeles del sprite. `ring` solo
# existe en los looks que lo tienen prendido.
# Medidas sobre los pixeles que realmente salen del sprite, no sobre los radios
# que se le pasan a Pillow: Pillow rasteriza una elipse inscrita en una caja de
# lados fraccionarios y termina mas gorda que 2*r. La pupila real ocupa 3x4 px,
# asi que el motor tiene que apuntar a eso o le cambia la mirada.
# Cada version tiene su propio ojo. `ring`/`plain` son con que radios lo dibuja
# el generador (segun el look tenga o no el delineado), y `engine` con que lo
# repinta el motor en vivo — que son numeros distintos porque Pillow rasteriza
# mas gordo que 2*r y hay que compensarlo.
EYE_SETS = {
    # El de siempre: pupila grande, como se le ve en las fotos de cerca.
    "normal": {
        "spread": 3.6,
        "ring":  {"ring": [2.5, 2.8], "iris": [2.15, 2.45], "pupil": [0.9, 1.8],
                  "hi": 0.65, "hiOff": [-0.9, -1.7]},
        "plain": {"ring": None,       "iris": [2.0, 2.2],   "pupil": [0.75, 1.7],
                  "hi": 0.55, "hiOff": [-0.8, -1.7]},
        "engine": {
            True:  {"ring": [2.6, 3.0], "iris": [2.2, 2.6], "pupil": [1.3, 2.05],
                    "hi": 0.65, "hiOffset": [-0.9, -1.3], "maxGaze": 1.15},
            False: {"ring": None,       "iris": [2.1, 2.4], "pupil": [1.15, 1.95],
                    "hi": 0.55, "hiOffset": [-0.8, -1.3], "maxGaze": 1.05},
        },
    },
    # Mas chicos y mas juntos, con la pupila fina y el oliva dominando.
    "small": {
        "spread": 3.3,
        "ring":  {"ring": [2.2, 2.35], "iris": [1.9, 2.05], "pupil": [0.45, 1.1],
                  "hi": 0.55, "hiOff": [-0.85, -1.5]},
        "plain": {"ring": None,        "iris": [1.85, 1.95], "pupil": [0.4, 1.05],
                  "hi": 0.5, "hiOff": [-0.75, -1.5]},
        "engine": {
            True:  {"ring": [2.35, 2.4], "iris": [2.0, 2.1], "pupil": [0.92, 1.35],
                    "hi": 0.5, "hiOffset": [-0.85, -1.15], "maxGaze": 0.95},
            False: {"ring": None,        "iris": [1.9, 2.0], "pupil": [0.85, 1.25],
                    "hi": 0.5, "hiOffset": [-0.8, -1.15], "maxGaze": 0.9},
        },
    },
}

# El del look que se esta dibujando ahora mismo, igual que MARKS.
EYE = EYE_SETS["normal"]


def mk(name):
    """Si el look que se esta dibujando tiene ese rasgo prendido."""
    return bool(MARKS.get(name))

# ---------------------------------------------------------------- primitivas


def ell(d, cx, cy, rx, ry, fill):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)


def mix(a, b, k):
    """Mezcla dos colores. Sirve para que los tonos no corten de golpe."""
    return tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(4))


def bezier(p0, p1, p2, steps=14):
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
        out.append((x, y))
    return out


def fluff(d, cx, cy, rx, ry, color, n=11, amp=1.7, a0=0.0, a1=math.tau):
    """Mechones sobre el contorno de una elipse. Es lo que la hace de pelo largo."""
    for i in range(n):
        a = a0 + (a1 - a0) * (i / max(1, n - 1))
        ell(d, cx + math.cos(a) * rx, cy + math.sin(a) * ry, amp, amp, color)


def tail(d, p0, p1, p2, color, r0=3.6, r1=2.4, plume=True):
    """Cola de pelo largo: gruesa y con mechones."""
    pts = bezier(p0, p1, p2)
    n = len(pts) - 1
    for i, (x, y) in enumerate(pts):
        r = r0 + (r1 - r0) * (i / n)
        ell(d, x, y, r, r, color)
    if not plume:
        return
    # Mechones que sobresalen del eje de la cola.
    for i in range(2, len(pts) - 1, 2):
        x, y = pts[i]
        px, py = pts[i - 1]
        dx, dy = x - px, y - py
        m = math.hypot(dx, dy) or 1
        nx, ny = -dy / m, dx / m
        r = r0 + (r1 - r0) * (i / n)
        ell(d, x + nx * r * 0.8, y + ny * r * 0.8, 1.5, 1.5, color)
        ell(d, x - nx * r * 0.8, y - ny * r * 0.8, 1.5, 1.5, color)


def cola(d, t, bx, by, modo, P):
    """
    La cola, con humor. Antes casi todas las poses usaban la misma curva y se
    notaba muchisimo: la cola es lo mas expresivo que tiene un gato y estaba
    diciendo siempre lo mismo.

      alta       parada y con la punta temblando. Contenta, saludando.
      baja       apoyada y floja, con un latigazo lento cada tanto.
      latigazo   barre de lado a lado. Concentrada, o molesta.
      enroscada  le rodea el cuerpo. Dormida, o hecha un pan.
    """
    ph = t * math.tau
    if modo == "alta":
        p1 = (bx - 8, by - 13)
        p2 = (bx - 3 + math.sin(ph * 2) * 2.6, by - 27)
    elif modo == "baja":
        p1 = (bx - 10, by - 4)
        p2 = (bx - 19 + math.sin(ph) * 3.4, by - 1)
    elif modo == "latigazo":
        sw = math.sin(ph * 2)
        p1 = (bx - 5 + sw * 7, by - 10)
        p2 = (bx - 1 + sw * 14, by - 20)
    else:  # enroscada
        p1 = (bx + 8, by - 10)
        p2 = (bx - 12 + math.sin(ph) * 1.2, by - 7)
    tail(d, (bx, by), p1, p2, P["dark"])


def leg(d, x, y_top, y_bot, color, w=1.6):
    d.rectangle([x - w, y_top, x + w, y_bot], fill=color)
    ell(d, x, y_bot, w + 0.4, 1.4, color)   # patita


def add_outline(img, color):
    """Contorno de 1px: todo pixel transparente pegado a uno opaco."""
    px = img.load()
    w, h = img.size
    out = img.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0:
                    op[x, y] = color
                    break
    return out


def hex2rgba(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


# ------------------------------------------------------------------- partes


def head(d, cx, cy, P, eyes="open", tilt=0.0, t=None):
    """
    Su cabeza: gorro gris tabby arriba, blaze blanco al medio de la frente,
    melena de pelo largo alrededor, orejas rosas por dentro.

    Si se le pasa `t` (la fase de la animacion) tambien parpadea y le da un tic
    de oreja. Antes solo parpadeaba en idle: en el resto de las poses tenia los
    ojos fijos como un muñeco, y las dos orejas se movian siempre juntas, que es
    lo que menos hace un gato.
    """
    # Un parpadeo corto en un punto de la vuelta. Como cada animacion tiene su
    # largo y su velocidad, ninguna parpadea al mismo tiempo que otra.
    if eyes == "open" and t is not None and 0.72 <= t < 0.86:
        eyes = "closed"

    # El tic: se mueve UNA oreja sola, no las dos. En dos momentos distintos de
    # la vuelta, y cada vez la otra.
    tic, cual = 0.0, 0
    if t is not None:
        if 0.26 <= t < 0.36:
            tic, cual = 0.9, -1
        elif 0.50 <= t < 0.58:
            tic, cual = 0.7, 1
    # melena: mechones que rodean toda la cabeza
    fluff(d, cx, cy + 0.5, 8.3, 7.3, P["base"], n=15, amp=1.8)

    # Orejas. La izquierda es la gris; la derecha es blanca como el resto de ese
    # lado de la cara. Rosas por dentro las dos.
    for sign, ox in ((-1, -5), (1, 5)):
        bx = cx + ox
        gira = tilt + (tic if sign == cual else 0.0)
        tipx = bx + 1 + sign * gira * 2
        tipy = cy - 12 + abs(gira)
        if mk("sideCap"):
            # Con el parche de un lado, esa oreja es gris y la otra blanca. La
            # blanca necesita un tono apenas mas oscuro o desaparece sobre la
            # cabeza blanca: el contorno de 1px solo agarra bordes contra
            # transparente, no contra otro relleno.
            outer = P["dark"] if sign > 0 else mix(P["base"], P["dark"], 0.34)
        else:
            outer = P["dark"]
        d.polygon([(bx - 3.2, cy - 4), (tipx, tipy), (bx + 3.2, cy - 3)], fill=outer)
        d.polygon([(bx - 1.2, cy - 5), (tipx + sign * 0.4, tipy + 3.0), (bx + 1.8, cy - 4)],
                  fill=P["pink"])

    # craneo
    ell(d, cx, cy, 8, 7, P["base"])

    if mk("sideCap"):
        # El parche gris va de UN SOLO lado: SU izquierda, que mirandola de
        # frente cae del lado derecho. Y le queda por ENCIMA del ojo, no encima
        # del ojo: en las fotos el ojo de ese lado se ve entero.
        #
        # Angulos de Pillow: 0 = derecha, 90 = abajo, 180 = izquierda,
        # 270 = arriba. De 250 a 350: pasa apenas el eje vertical hacia el lado
        # blanco, cruza el techo y baja por el lado gris hasta arriba del ojo.
        d.pieslice([cx - 8, cy - 7.8, cx + 8, cy + 5.6], 250, 350, fill=P["dark"])

        if mk("tabby"):
            d.pieslice([cx - 6.4, cy - 7.4, cx + 6.4, cy + 2.4], 256, 345, fill=P["deep"])
            d.pieslice([cx - 4.2, cy - 7.0, cx + 4.2, cy - 0.4], 264, 338,
                       fill=mix(P["deep"], P["dark"], 0.35))

        # El borde no es una linea limpia: unos mechones lo desflecan.
        for a in (0.30, 0.52, 0.74, 0.96):
            ang = -0.62 - a * 0.9
            ell(d, cx + math.cos(ang) * 3.4, cy + math.sin(ang) * 5.0, 1.5, 1.5, P["dark"])
        ell(d, cx + 7.0, cy - 1.4, 1.6, 1.6, P["dark"])

        # El blaze arranca entre los ojos y se abre hacia el lado blanco.
        d.polygon([(cx - 0.4, cy + 2.0), (cx - 1.4, cy - 7.2), (cx - 3.4, cy + 2.0)],
                  fill=P["light"])
    else:
        # El gorro gris cruzado, que le baja hasta la altura de los ojos.
        d.pieslice([cx - 8, cy - 6.5, cx + 8, cy + 7.5], 182, 358, fill=P["dark"])

        if mk("tabby"):
            # El gorro no es de un solo gris: el centro mas oscuro y se va
            # aclarando hacia las sienes. Eso le da el aire de tabby.
            d.pieslice([cx - 6.2, cy - 6.2, cx + 6.2, cy + 4.0], 195, 345, fill=P["deep"])
            d.pieslice([cx - 4.0, cy - 5.6, cx + 4.0, cy + 1.0], 200, 340,
                       fill=mix(P["deep"], P["dark"], 0.35))

        # El blaze blanco baja por el medio de la frente.
        d.polygon([(cx - 2.5, cy + 1.5), (cx - 0.2, cy - 7.4), (cx + 2.5, cy + 1.5)],
                  fill=P["light"])

    # cachetes de pelo largo (solo la mitad de abajo, para no comerse el parche)
    fluff(d, cx, cy + 1.5, 8.1, 6.4, P["base"], n=9, amp=1.7, a0=0.25, a1=math.pi - 0.25)

    if mk("tabby") and not mk("sideCap"):
        # El gris le baja por fuera de cada ojo hasta el cachete: blaze blanco
        # al medio y gris a los lados.
        for ex in (cx - 6.0, cx + 6.4):
            ell(d, ex, cy - 0.6, 2.2, 3.0, P["dark"])

    # hocico
    ell(d, cx + 1, cy + 3.6, 5.2, 3.5, P["light"])

    # ojos
    if eyes == "open":
        E = EYE["ring"] if mk("eyeRing") else EYE["plain"]
        for ex in (cx - EYE["spread"], cx + EYE["spread"]):
            EYE_MARKS.append([round(ex, 2), round(cy - 0.4, 2)])
            if E["ring"]:
                # delineado marron finito alrededor del iris
                ell(d, ex, cy - 0.4, E["ring"][0], E["ring"][1], P["deep"])
            ell(d, ex, cy - 0.4, E["iris"][0], E["iris"][1], P["eye"])
            ell(d, ex, cy - 0.45, E["pupil"][0], E["pupil"][1],
                P["pupil"] if mk("eyeRing") else P["outline"])
            ell(d, ex + E["hiOff"][0], cy + E["hiOff"][1], E["hi"], E["hi"], P["light"])
    elif eyes == "half":
        d.rectangle([cx - 5.4, cy - 1.2, cx - 1.8, cy + 0.4], fill=P["eye"])
        d.rectangle([cx + 1.8, cy - 1.2, cx + 5.4, cy + 0.4], fill=P["eye"])
    else:  # cerrados
        d.line([cx - 5.4, cy - 0.4, cx - 1.8, cy - 0.4], fill=P["outline"])
        d.line([cx + 1.8, cy - 0.4, cx + 5.4, cy - 0.4], fill=P["outline"])

    # nariz rosa
    ell(d, cx + 1, cy + 2.1, 1.2, 0.9, P["pink"])


def stripes_body(d, cx, cy, rx, ry, P, n=3):
    """Pelo largo del cuerpo: mechones sobre el contorno, no rayas."""
    fluff(d, cx, cy + ry * 0.35, rx * 1.16, ry * 1.42, P["base"], n=14, amp=1.6)


# -------------------------------------------------------------------- poses


def pose_sit(d, t, P):
    """Sentada de 3/4, cola enroscada. t = fase de respiracion."""
    bob = math.sin(t * math.tau) * 0.7
    cola(d, t, 14, GROUND - 3, "baja", P)
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])          # cuerpo
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])       # pecho
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])      # patas delanteras
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22, P, t=t)


def pose_idle(d, t, P):
    """Igual que sit pero parpadea."""
    frame = int(t * 4) % 4
    bob = math.sin(t * math.tau) * 0.7
    cola(d, t, 14, GROUND - 3, "alta", P)
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22, P, eyes="closed" if frame == 3 else "open")


def pose_walk(d, t, P):
    """Perfil caminando a la derecha, 4 fases de patas."""
    ph = t * math.tau
    swing_f = math.sin(ph) * 3.5
    swing_b = math.sin(ph + math.pi) * 3.5
    bob = abs(math.sin(ph)) * 1.2

    cola(d, t, 10, GROUND - 12 + bob, "alta", P)
    # patas traseras
    leg(d, 12 + swing_b, GROUND - 10 + bob, GROUND - 1, P["dark"])
    leg(d, 26 + swing_b, GROUND - 10 + bob, GROUND - 1, P["dark"])
    # torso horizontal
    ell(d, 20, GROUND - 14 + bob, 11, 6.5, P["base"])
    ell(d, 21, GROUND - 11 + bob, 8, 3.5, P["light"])
    stripes_body(d, 20, GROUND - 16 + bob, 9, 5, P)
    # patas delanteras
    leg(d, 15 + swing_f, GROUND - 10 + bob, GROUND - 1, P["base"])
    leg(d, 29 + swing_f, GROUND - 10 + bob, GROUND - 1, P["base"])
    head(d, 31, GROUND - 20, P, t=t)


def pose_run(d, t, P):
    ph = t * math.tau
    stretch = math.sin(ph) * 5
    bob = abs(math.cos(ph)) * 2
    tail(d, (9, GROUND - 16 + bob), (1, GROUND - 22), (10, GROUND - 30), P["dark"])
    leg(d, 12 - stretch, GROUND - 11 + bob, GROUND - 2, P["dark"])
    leg(d, 24 - stretch, GROUND - 11 + bob, GROUND - 3, P["dark"])
    stripes_body(d, 21, GROUND - 17 + bob, 10, 4, P)
    ell(d, 21, GROUND - 15 + bob, 12, 5.5, P["base"])
    ell(d, 22, GROUND - 12 + bob, 9, 3, P["light"])
    leg(d, 18 + stretch, GROUND - 11 + bob, GROUND - 3, P["base"])
    leg(d, 31 + stretch, GROUND - 11 + bob, GROUND - 2, P["base"])
    head(d, 33, GROUND - 20, P, eyes="half")


def pose_sleep(d, t, P):
    """Ovillada, con la cola envolviendola. Respira lento."""
    breath = math.sin(t * math.tau) * 0.8
    # la cola le da la vuelta por delante
    tail(d, (36, GROUND - 4), (42, GROUND - 14), (22, GROUND - 14), P["dark"], r0=3.4, r1=2.6)
    # cuerpo hecho un ovillo
    fluff(d, 25, GROUND - 8 + breath, 13.5, 8.4, P["base"], n=17, amp=1.8)
    ell(d, 25, GROUND - 9 + breath, 13, 8, P["base"])
    ell(d, 27, GROUND - 5, 9.5, 4, P["light"])
    # la cabeza apoyada sobre el cuerpo
    head(d, 14, GROUND - 13, P, eyes="closed", tilt=0.4)


def pose_loaf(d, t, P):
    """
    Echada como un pan: las patas metidas debajo, el lomo redondo y la cabeza
    levantada. No esta durmiendo, esta mirando. Respira lento y parpadea.
    """
    breath = math.sin(t * math.tau) * 0.6
    frame = int(t * 6) % 6

    # la cola le da la vuelta por delante, apoyada en el piso
    cola(d, t, 9, GROUND - 3, "enroscada", P)

    # el bulto del cuerpo: ancho abajo y redondo arriba, sin patas a la vista
    fluff(d, 22, GROUND - 7 + breath, 12.6, 7.4, P["base"], n=16, amp=1.7)
    ell(d, 22, GROUND - 7 + breath, 12, 7, P["base"])

    # el pecho claro que llega hasta el piso: es lo que le tapa las patas
    ell(d, 25, GROUND - 3.5, 9, 3.2, P["light"])

    # cabeza levantada, mirando al frente
    head(d, 31, GROUND - 17 + breath * 0.5, P,
         eyes="closed" if frame == 4 else "open", tilt=-0.2)


def pose_groom(d, t, P):
    """Sentada lamiendose la pata."""
    ph = t * math.tau
    lick = math.sin(ph) * 2
    cola(d, t, 14, GROUND - 3, "baja", P)
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    # pata levantada hacia la cara
    d.rectangle([27, GROUND - 20 + lick, 31, GROUND - 8], fill=P["base"])
    head(d, 27, GROUND - 22 + lick, P, eyes="closed", tilt=0.4)

    # La lengüita. Va despues de la cabeza para que se vea, y sale mas o menos
    # segun la fase: el lengüetazo tiene ida y vuelta.
    out = 0.85 + max(0.0, math.sin(ph)) * 1.25
    ty = GROUND - 22 + lick + 3.9
    tongue = mix(P["pink"], (208, 92, 100, 255), 0.5)
    ell(d, 28.8, ty + out * 0.45, 1.7, out, tongue)
    ell(d, 28.8, ty + out * 0.15, 0.95, out * 0.5,
        mix(tongue, (255, 255, 255, 255), 0.28))


def pose_stretch(d, t, P):
    """Estirandose: adelante abajo, cadera arriba."""
    k = math.sin(t * math.pi)          # 0 -> 1 -> 0
    tail(d, (8, GROUND - 16), (2, GROUND - 26 - 4 * k), (12, GROUND - 32 - 6 * k), P["dark"])
    leg(d, 12, GROUND - 14 - 4 * k, GROUND - 1, P["dark"])
    leg(d, 24, GROUND - 12 - 2 * k, GROUND - 1, P["dark"])
    d.polygon(
        [(10, GROUND - 20 - 5 * k), (30, GROUND - 12), (34, GROUND - 6), (12, GROUND - 10)],
        fill=P["base"],
    )
    stripes_body(d, 20, GROUND - 15 - 2 * k, 9, 4, P)
    ell(d, 20, GROUND - 13 - 2 * k, 11, 5, P["base"])
    ell(d, 24, GROUND - 10, 8, 3, P["light"])
    leg(d, 32, GROUND - 8, GROUND - 1, P["base"])
    head(d, 34, GROUND - 11 - 1 * k, P, eyes="closed")


def pose_fall(d, t, P):
    """Cayendo: patas abiertas, cola rigida."""
    w = math.sin(t * math.tau) * 2
    tail(d, (10, GROUND - 18), (2, GROUND - 22 + w), (6, GROUND - 30), P["dark"])
    for lx, ly in ((13, GROUND - 6), (17, GROUND - 3), (27, GROUND - 3), (31, GROUND - 6)):
        leg(d, lx + w * 0.5, GROUND - 16, ly, P["base"])
    stripes_body(d, 22, GROUND - 20, 9, 4.5, P)
    ell(d, 22, GROUND - 18, 11, 6, P["base"])
    ell(d, 22, GROUND - 15, 8, 3.5, P["light"])
    head(d, 31, GROUND - 22, P, eyes="open", tilt=1.2)


def pose_climb(d, t, P):
    """Trepando: cuerpo vertical contra un borde."""
    ph = t * math.tau
    reach = math.sin(ph) * 3
    tail(d, (24, GROUND - 4), (32, GROUND - 10), (30, GROUND - 20), P["dark"])
    stripes_body(d, 22, GROUND - 18, 5.5, 9, P)
    ell(d, 22, GROUND - 16, 6.5, 12, P["base"])
    ell(d, 24, GROUND - 16, 4, 9, P["light"])
    d.rectangle([15, GROUND - 30 - reach, 19, GROUND - 20], fill=P["base"])
    d.rectangle([25, GROUND - 26 + reach, 29, GROUND - 18], fill=P["base"])
    head(d, 22, GROUND - 32, P, eyes="open")


def pose_eat(d, t, P):
    """Comiendo del plato: cuerpo bajo, cabeza al piso, mastica."""
    chew = math.sin(t * math.tau * 2) * 1.4
    tail(d, (9, GROUND - 10), (2, GROUND - 18), (8, GROUND - 24), P["dark"])
    leg(d, 13, GROUND - 9, GROUND - 1, P["dark"])
    leg(d, 25, GROUND - 9, GROUND - 1, P["dark"])
    ell(d, 19, GROUND - 13, 11, 6, P["base"])
    ell(d, 20, GROUND - 10, 8, 3.5, P["light"])
    stripes_body(d, 19, GROUND - 15, 9, 5, P)
    leg(d, 29, GROUND - 9, GROUND - 1, P["base"])
    head(d, 32, GROUND - 11 + chew, P, eyes="closed", tilt=0.5)


def pose_crouch(d, t, P):
    """Agazapada antes de saltar. La cadera se mueve."""
    wig = math.sin(t * math.tau * 3) * 1.8
    tail(d, (9, GROUND - 6), (2, GROUND - 3), (11, GROUND - 2 + wig), P["dark"])
    leg(d, 13 + wig, GROUND - 7, GROUND - 1, P["dark"])
    leg(d, 26, GROUND - 6, GROUND - 1, P["dark"])
    ell(d, 20 + wig * 0.4, GROUND - 9, 12, 4.5, P["base"])
    ell(d, 22, GROUND - 7, 9, 2.8, P["light"])
    stripes_body(d, 20, GROUND - 10, 9, 3.5, P)
    leg(d, 30, GROUND - 6, GROUND - 1, P["base"])
    head(d, 33, GROUND - 12, P, eyes="open", tilt=-0.6)


def pose_pounce(d, t, P):
    """En el aire, patas delanteras estiradas hacia adelante."""
    k = math.sin(t * math.pi)
    tail(d, (8, GROUND - 22), (0, GROUND - 31), (9, GROUND - 37), P["dark"])
    leg(d, 12, GROUND - 21, GROUND - 14 + 3 * k, P["dark"])
    leg(d, 17, GROUND - 21, GROUND - 12 + 3 * k, P["dark"])
    stripes_body(d, 21, GROUND - 25, 10, 4, P)
    ell(d, 21, GROUND - 23, 12, 5.5, P["base"])
    ell(d, 22, GROUND - 20, 9, 3, P["light"])
    d.rectangle([30, GROUND - 25, 41 - 2 * k, GROUND - 22], fill=P["base"])
    d.rectangle([30, GROUND - 21, 40 - 2 * k, GROUND - 18], fill=P["base"])
    head(d, 32, GROUND - 29, P, eyes="open")


def pose_play(d, t, P):
    """Sentada manoteando algo con la pata delantera."""
    swat = math.sin(t * math.tau) * 6
    cola(d, t, 14, GROUND - 3, "latigazo", P)
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    d.rectangle([28, GROUND - 18 - swat, 32, GROUND - 8 - swat * 0.3], fill=P["base"])
    ell(d, 30, GROUND - 18 - swat, 2.4, 2.0, P["base"])
    head(d, 27, GROUND - 22, P, eyes="open", tilt=0.3, t=t)


def pose_slide(d, t, P):
    """Derrapando de panza: cuerpo bajo y estirado, patas atras, polvito."""
    tail(d, (6, GROUND - 13), (0, GROUND - 22), (9, GROUND - 27), P["dark"])
    # patas traseras arrastrando
    leg(d, 10, GROUND - 8, GROUND - 2, P["dark"])
    leg(d, 15, GROUND - 8, GROUND - 1, P["dark"])
    stripes_body(d, 23, GROUND - 12, 11, 4, P)
    ell(d, 23, GROUND - 10, 13, 5, P["base"])
    ell(d, 25, GROUND - 7.5, 10, 3, P["light"])
    # patas delanteras estiradas hacia adelante
    d.rectangle([32, GROUND - 10, 42, GROUND - 7], fill=P["base"])
    d.rectangle([32, GROUND - 6, 40, GROUND - 3], fill=P["base"])
    head(d, 33, GROUND - 17, P, eyes="half", tilt=-0.5)
    # polvito del derrape, se va corriendo con el frame
    for i in range(3):
        x = 8 + i * 5 - t * 5
        ell(d, x, GROUND - 2 - i * 0.8, 1.1 + i * 0.4, 0.9, P["light"])


def pose_dig(d, t, P):
    """Escarbando el arenero: agachada, las patas delanteras van y vienen."""
    ph = t * math.tau
    paw = math.sin(ph) * 3.5
    bob = abs(math.sin(ph)) * 1.0
    tail(d, (9, GROUND - 12), (2, GROUND - 20), (10, GROUND - 25), P["dark"])
    leg(d, 13, GROUND - 9 + bob, GROUND - 1, P["dark"])
    leg(d, 23, GROUND - 9 + bob, GROUND - 1, P["dark"])
    stripes_body(d, 21, GROUND - 15 + bob, 10, 4.5, P)
    ell(d, 21, GROUND - 13 + bob, 11.5, 6, P["base"])
    ell(d, 23, GROUND - 10 + bob, 8, 3.2, P["light"])
    # las patitas que escarban
    d.rectangle([29 + paw, GROUND - 11 + bob, 32.5 + paw, GROUND - 2], fill=P["base"])
    ell(d, 30.7 + paw, GROUND - 2, 2.2, 1.4, P["light"])
    head(d, 32, GROUND - 20, P, eyes="half", tilt=0.3)
    # arenita saltando
    for i in range(3):
        ell(d, 36 + i * 3.2 + paw * 0.6,
            GROUND - 4 - i * 2.2 - abs(paw) * 0.7, 1.0, 0.9, SAND_HI)


def pose_yawn(d, t, P):
    """
    El bostezo de recien levantada. La boca se abre y se cierra con la fase, y
    en el medio saca un poco la lengua.
    """
    k = math.sin(t * math.pi)                 # abre y cierra una sola vez
    bob = math.sin(t * math.tau) * 0.6
    tail(d, (14, GROUND - 3), (5, GROUND - 12), (13, GROUND - 18), P["dark"])
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22, P, eyes="closed", tilt=0.5)
    # La boca abierta, debajo de la nariz.
    if k > 0.12:
        alto = 1.2 + k * 3.4
        ell(d, 28, GROUND - 18.4 + alto * 0.35, 2.6 + k * 0.9, alto, P["outline"])
        ell(d, 28, GROUND - 17.6 + alto * 0.55, 1.5 + k * 0.6, alto * 0.55,
            mix(P["pink"], (208, 92, 100, 255), 0.5))


def pose_startle(d, t, P):
    """
    Sobresaltada: lomo arqueado, cola inflada y orejas para atras. Va aflojando
    con el correr de los frames — el susto dura poco y despues queda mirando.
    """
    k = max(0.0, 1 - t * 1.5)            # cuanto le queda del susto
    puff = 3.6 + k * 2.6                 # la cola se infla y se desinfla
    tail(d, (12, GROUND - 9), (3, GROUND - 24 - k * 5), (15, GROUND - 32 - k * 7),
         P["dark"], r0=puff, r1=puff * 0.75)
    leg(d, 13, GROUND - 12 - k * 2, GROUND - 1, P["dark"])
    leg(d, 27, GROUND - 12 - k * 2, GROUND - 1, P["dark"])
    stripes_body(d, 20, GROUND - 19 - k * 2, 10, 5, P)
    ell(d, 20, GROUND - 17 - k * 2, 11, 6.4, P["base"])      # el lomo alto
    ell(d, 21, GROUND - 14 - k * 2, 8, 3.2, P["light"])
    leg(d, 17, GROUND - 12 - k * 2, GROUND - 1, P["base"])
    leg(d, 30, GROUND - 12 - k * 2, GROUND - 1, P["base"])
    head(d, 31, GROUND - 25 - k * 2, P, eyes="open", tilt=-1.1 - k * 0.5)


def pose_frotar(d, t, P):
    """
    Frotando el cachete contra algo. La cabeza va y viene apretada y el cuerpo
    la acompaña; los ojos van cerrados, que es como lo hacen. Asi marcan lo que
    es suyo.
    """
    ph = t * math.tau
    ida = math.sin(ph) * 3.6
    lean = math.sin(ph) * 1.3
    cola(d, t, 11, GROUND - 4, "alta", P)
    stripes_body(d, 20 + lean, GROUND - 13, 9, 5, P)
    ell(d, 20 + lean, GROUND - 11, 10.5, 6.2, P["base"])
    ell(d, 22 + lean, GROUND - 8, 7.5, 3.2, P["light"])
    leg(d, 16, GROUND - 8, GROUND - 1, P["dark"])
    leg(d, 26, GROUND - 8, GROUND - 1, P["base"])
    head(d, 31 + ida, GROUND - 17, P, eyes="closed", tilt=0.9)


def pose_olfatear(d, t, P):
    """
    Olfateando el piso: la nariz abajo, avanzando muy despacio. Las patas se
    mueven poco — no esta yendo a ningun lado, esta siguiendo algo.
    """
    ph = t * math.tau
    sw = math.sin(ph) * 2.0
    bob = abs(math.sin(ph * 2)) * 0.8
    cola(d, t, 9, GROUND - 12, "baja", P)
    leg(d, 12 - sw, GROUND - 10 + bob, GROUND - 1, P["dark"])
    leg(d, 24 - sw, GROUND - 10 + bob, GROUND - 1, P["dark"])
    stripes_body(d, 20, GROUND - 16 + bob, 10, 5, P)
    ell(d, 20, GROUND - 14 + bob, 11, 6, P["base"])
    ell(d, 21, GROUND - 11 + bob, 8, 3.2, P["light"])
    leg(d, 16 + sw, GROUND - 10 + bob, GROUND - 1, P["base"])
    leg(d, 29 + sw, GROUND - 10 + bob, GROUND - 1, P["base"])
    head(d, 33, GROUND - 10 + bob * 0.6, P, eyes="half", tilt=0.5)
    # el olfateo: unas rayitas cortas delante de la nariz
    for i in range(2):
        x = 40 + i * 2.5
        y = GROUND - 8 + math.sin(ph * 3 + i) * 1.2
        d.line([(x, y), (x + 2, y)], fill=P["light"])


def pose_blep(d, t, P):
    """
    El blep: se distrajo a mitad de lamerse y le quedo la lengua un poco afuera,
    quieta. Ni se da cuenta. Despues la mete y sigue como si nada.
    """
    bob = math.sin(t * math.tau) * 0.6
    cola(d, t, 14, GROUND - 3, "baja", P)
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22, P, t=t)
    # La lengüita afuera, quieta. Que este quieta es todo el chiste.
    tongue = mix(P["pink"], (208, 92, 100, 255), 0.5)
    ty = GROUND - 22 + 4.4
    ell(d, 28.6, ty, 1.5, 1.5, tongue)
    ell(d, 28.6, ty - 0.5, 0.9, 0.8, mix(tongue, (255, 255, 255, 255), 0.28))


def pose_sacudirse(d, t, P):
    """
    La sacudida de todo el cuerpo, de la cabeza a la cola. Va rapidisima y se
    dibuja con el cuerpo corrido a un lado y al otro; las orejas van al reves
    que la cabeza, que es lo que le da el latigazo.
    """
    ph = t * math.tau
    sac = math.sin(ph * 4)
    cuerpo = sac * 2.6
    cabeza = math.sin(ph * 4 + 1.1) * 3.4
    cola(d, t, 14 - cuerpo, GROUND - 3, "baja", P)
    stripes_body(d, 20 + cuerpo, GROUND - 11, 8, 7, P)
    ell(d, 20 + cuerpo, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21 + cuerpo, GROUND - 4, 6.5, 5.5, P["light"])
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9, GROUND - 1, P["base"])
    head(d, 27 + cabeza, GROUND - 22, P, eyes="closed", tilt=-0.5 - sac * 0.6)


def pose_amasar(d, t, P):
    """
    Amasando: aprieta con las patas delanteras alternadas, como haciendo pan.
    Lo hacen cuando estan de verdad comodas, asi que va antes de dormirse.
    """
    ph = t * math.tau
    izq = max(0.0, math.sin(ph)) * 4.5
    der = max(0.0, math.sin(ph + math.pi)) * 4.5
    bob = (izq + der) * 0.12
    cola(d, t, 14, GROUND - 3, "enroscada", P)
    stripes_body(d, 20, GROUND - 12 + bob, 9, 6, P)
    ell(d, 20, GROUND - 10 + bob, 10, 6.6, P["base"])
    ell(d, 22, GROUND - 7 + bob, 7.5, 3.4, P["light"])
    for px, alto in ((25.5, izq), (30.5, der)):
        d.rectangle([px - 2, GROUND - 8 - alto, px + 2, GROUND - 1], fill=P["base"])
        ell(d, px, GROUND - 8 - alto, 2.5, 2.2, P["light"])
    head(d, 28, GROUND - 20 + bob * 0.5, P, eyes="half", tilt=0.3)


def pose_rascarse(d, t, P):
    """
    Rascandose la oreja con la pata de atras. La pata va rapidisima a proposito:
    esa vibracion es lo que hace reconocible el gesto — mas lento parece que se
    esta estirando.

    La pata se dibuja DESPUES de la cabeza. Si va antes queda tapada, porque
    llega justo a la altura de la oreja.
    """
    ph = t * math.tau
    vib = math.sin(ph * 5) * 2.4
    lad = math.sin(ph * 5) * 0.7          # la cabeza acompaña un poco

    tail(d, (14, GROUND - 3), (6, GROUND - 9), (15, GROUND - 14), P["dark"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    leg(d, 23, GROUND - 9, GROUND - 1, P["base"])

    head(d, 26, GROUND - 21 + lad, P, eyes="closed", tilt=0.7)

    # La pata trasera, desde la cadera hasta la oreja.
    px, py = 32.5, GROUND - 20 + vib
    d.line([(22, GROUND - 7), (px - 1, py + 1)], fill=P["base"], width=5)
    d.line([(22, GROUND - 7), (px - 1, py + 1)], fill=P["light"], width=2)
    ell(d, px, py, 2.7, 2.5, P["base"])
    ell(d, px + 0.3, py + 0.4, 1.9, 1.7, P["light"])


def pose_angry(d, t, P):
    """
    Enojada: orejas planas para atras, ojos entrecerrados, la boca abierta del
    bufido y la cola dando latigazos bajos y rapidos. Se le paso la mano con
    las caricias.
    """
    ph = t * math.tau
    sw = math.sin(ph * 3)                     # el latigazo va rapido
    tenso = abs(math.sin(ph * 2)) * 0.9
    # La cola baja, barriendo el piso de un lado al otro.
    tail(d, (14, GROUND - 4), (4 + sw * 8, GROUND - 6), (17 + sw * 15, GROUND - 2),
         P["dark"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    ell(d, 20, GROUND - 8, 9, 9.2, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9, GROUND - 1, P["base"])
    head(d, 27, GROUND - 21 - tenso, P, eyes="half", tilt=-1.5)
    # La boca abierta del bufido, con los colmillos.
    by = GROUND - 21 - tenso + 3.2
    d.polygon([(25.4, by), (30.6, by), (28, by + 5.2)], fill=P["outline"])
    d.polygon([(26.4, by + 0.7), (29.6, by + 0.7), (28, by + 3.4)],
              fill=mix(P["pink"], (208, 92, 100, 255), 0.55))
    d.polygon([(25.8, by + 0.2), (27.0, by + 0.2), (26.4, by + 2.2)], fill=P["light"])
    d.polygon([(29.0, by + 0.2), (30.2, by + 0.2), (29.6, by + 2.2)], fill=P["light"])


def pose_rear(d, t, P):
    """
    Parada en dos patas, manoteando algo en el aire.

    Sale poco a proposito: es un gesto puntual, y si lo hiciera seguido dejaria
    de llamar la atencion. La celda mide 48 y parada ocupa casi todo el alto,
    asi que las medidas van justas para que las orejas no queden cortadas.
    """
    ph = t * math.tau
    manota = math.sin(ph * 2) * 3.6
    bal = math.sin(ph) * 1.1                  # se balancea para no caerse

    # La cola le hace de contrapeso, estirada para atras.
    tail(d, (12, GROUND - 8), (2, GROUND - 15 + bal), (11, GROUND - 25), P["dark"])

    leg(d, 17 - bal, GROUND - 10, GROUND - 1, P["dark"])
    leg(d, 23 - bal, GROUND - 10, GROUND - 1, P["base"])

    # El cuerpo, parado y estirado.
    stripes_body(d, 21 + bal, GROUND - 21, 6, 8, P)
    ell(d, 21 + bal, GROUND - 19, 7.2, 9.5, P["base"])
    ell(d, 23 + bal, GROUND - 17, 4.6, 6.5, P["light"])

    # Las patas delanteras arriba, manoteando alternadas.
    # Bien separadas del cuerpo: pegadas al torso se perdian, porque son del
    # mismo color y quedaban adentro de la silueta.
    for lado, fase in ((1, manota), (-1, -manota)):
        px = 21 + bal + lado * 11.5
        py = GROUND - 24 - fase
        d.line([(21 + bal + lado * 4, GROUND - 18), (px, py + 2)],
               fill=P["base"], width=4)
        ell(d, px, py, 2.8, 2.5, P["base"])
        ell(d, px, py + 0.6, 2.0, 1.7, P["light"])

    head(d, 22 + bal, GROUND - 29, P, eyes="open", tilt=0.25, t=t)


def pose_stalk(d, t, P):
    """
    Acechando: el cuerpo pegado al piso y las patas avanzando muy despacio,
    una por vez. Con la pose de agazaparse, que es quieta, parecia flotar.
    """
    ph = t * math.tau
    sw_f = math.sin(ph) * 2.8
    sw_b = math.sin(ph + math.pi) * 2.8
    bob = abs(math.sin(ph * 2)) * 0.5
    # La cola va baja y estirada, casi rozando el piso.
    tail(d, (9, GROUND - 8 + bob), (1, GROUND - 5), (11, GROUND - 1), P["dark"])
    leg(d, 12 + sw_b, GROUND - 9 + bob, GROUND - 1, P["dark"])
    leg(d, 24 + sw_b, GROUND - 8 + bob, GROUND - 1, P["dark"])
    stripes_body(d, 21, GROUND - 12 + bob, 11, 4, P)
    ell(d, 21, GROUND - 11 + bob, 12.5, 4.4, P["base"])
    ell(d, 23, GROUND - 9 + bob, 9.5, 2.6, P["light"])
    leg(d, 17 + sw_f, GROUND - 9 + bob, GROUND - 1, P["base"])
    leg(d, 30 + sw_f, GROUND - 9 + bob, GROUND - 1, P["base"])
    # La cabeza baja y adelante, con las orejas para atras.
    head(d, 33, GROUND - 15 + bob, P, eyes="open", tilt=-0.8)


def pose_sit_alert(d, t, P):
    """Sentada, atenta, mirando al cursor. Orejas paradas, cola inquieta."""
    cola(d, t, 14, GROUND - 3, "latigazo", P)
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9, GROUND - 1, P["base"])
    head(d, 27, GROUND - 23, P, eyes="open", tilt=-0.4, t=t)


def pose_scratch(d, t, P):
    """
    Rascando el poste: parada en dos patas, estirada contra el, las de adelante
    subiendo y bajando alternadas. La cola contenta.
    """
    ph = t * math.tau
    a = math.sin(ph) * 4
    b = math.sin(ph + math.pi) * 4
    swish = math.sin(ph * 1.5) * 4

    tail(d, (16, GROUND - 6), (7 + swish, GROUND - 14), (15 + swish, GROUND - 24), P["dark"])
    # patas traseras, plantadas
    leg(d, 18, GROUND - 13, GROUND - 1, P["dark"])
    leg(d, 23, GROUND - 12, GROUND - 1, P["dark"])
    # cuerpo estirado hacia arriba
    ell(d, 23, GROUND - 19, 7.5, 11, P["base"])
    ell(d, 25, GROUND - 18, 5, 8, P["light"])
    stripes_body(d, 23, GROUND - 22, 6.5, 9, P)
    # las de adelante, arriba, una mas alta que la otra
    d.rectangle([27, GROUND - 33 + a, 30, GROUND - 20], fill=P["base"])
    d.rectangle([31, GROUND - 33 + b, 34, GROUND - 21], fill=P["base"])
    ell(d, 28.5, GROUND - 33 + a, 2.2, 1.8, P["light"])       # las manitos
    ell(d, 32.5, GROUND - 33 + b, 2.2, 1.8, P["light"])
    head(d, 27, GROUND - 34, P, eyes="half", tilt=-0.3)


ANIMATIONS = [
    # nombre,        fn,             frames, fps,  loop
    ("idle",         pose_idle,       8,     6,    True),
    ("sit",          pose_sit,        4,     4,    True),
    ("alert",        pose_sit_alert,  6,     8,    True),
    ("walk",         pose_walk,       8,     10,   True),
    ("run",          pose_run,        6,     14,   True),
    ("sleep",        pose_sleep,      6,     3,    True),
    ("loaf",         pose_loaf,       6,     4,    True),
    ("dig",           pose_dig,        6,     9,    True),
    ("scratch",      pose_scratch,    6,     8,    True),
    ("groom",        pose_groom,      6,     6,    True),
    ("stretch",      pose_stretch,    6,     6,    False),
    ("fall",         pose_fall,       4,     10,   True),
    ("climb",        pose_climb,      6,     8,    True),
    ("eat",          pose_eat,        6,     7,    True),
    ("crouch",       pose_crouch,     6,     10,   True),
    ("stalk",        pose_stalk,      8,     7,    True),
    ("rear",         pose_rear,       6,     9,    True),
    ("angry",        pose_angry,      6,     11,   True),
    ("rascarse",     pose_rascarse,   8,     14,   True),
    ("blep",         pose_blep,       4,     3,    True),
    ("frotar",       pose_frotar,     6,     6,    True),
    ("olfatear",     pose_olfatear,   6,     5,    True),
    ("sacudirse",    pose_sacudirse,  8,     16,   True),
    ("amasar",       pose_amasar,     6,     6,    True),
    ("startle",      pose_startle,    6,     9,    False),
    ("yawn",         pose_yawn,       6,     5,    False),
    ("pounce",       pose_pounce,     4,     12,   False),
    ("play",         pose_play,       6,     9,    True),
    ("slide",        pose_slide,      4,     12,   True),
]

# ------------------------------------------------------------------- objetos

PROP_CELL = 40        # la cama es ancha: no entraba en los 24 de antes
PROP_GROUND = 21      # linea del piso dentro de la celda

# El plato, la pelota y el premio estan dibujados pensando en una celda de 24.
# En vez de reescribirles todas las medidas, los corremos al centro de la nueva.
PX = (PROP_CELL - 24) / 2

# Su cama: azul grisaceo apagado, que corta bien contra el crema del pelaje.
BED_RIM = (126, 134, 158, 255)
BED_RIM_HI = (154, 162, 186, 255)
BED_IN = (112, 119, 145, 255)      # el almohadon
BED_IN_SH = (88, 94, 116, 255)     # su sombra contra el rodete de atras


def prop_bowl(d, t, P, full=False):
    d.polygon([(PX + 3, 15), (PX + 21, 15), (PX + 18, 20), (PX + 6, 20)],
              fill=P["light"])                                           # cuerpo
    ell(d, PX + 12, 15, 8, 2.4, P["light"])                              # borde
    if full:
        ell(d, PX + 12, 15, 6.0, 1.8, (150, 106, 70, 255))               # comida
        ell(d, PX + 10, 14, 1.6, 1.2, (176, 130, 88, 255))
        ell(d, PX + 14, 15, 1.4, 1.1, (176, 130, 88, 255))
    else:
        ell(d, PX + 12, 15.4, 6.0, 1.6, P["dark"])                       # hueco


def prop_water(d, t, P, full=True):
    """Su bebedero. Misma forma que el plato, con agua adentro."""
    d.polygon([(PX + 3, 15), (PX + 21, 15), (PX + 18, 20), (PX + 6, 20)],
              fill=P["light"])
    ell(d, PX + 12, 15, 8, 2.4, P["light"])
    if full:
        ripple = math.sin(t * math.tau) * 0.5
        ell(d, PX + 12, 15, 6.0, 1.8, (108, 158, 186, 255))               # agua
        ell(d, PX + 12, 14.6 + ripple, 4.4, 1.1, (146, 194, 216, 255))    # reflejo
        ell(d, PX + 9.5, 14.4, 1.1, 0.7, (198, 228, 240, 255))            # brillito
    else:
        ell(d, PX + 12, 15.4, 6.0, 1.6, P["dark"])


def prop_butterfly(d, t, P):
    """
    Una mariposa. Se dibuja apoyada en la linea del piso de la celda, asi que
    `y` es su panza: el motor la lleva volando por donde quiera.
    """
    g = PROP_GROUND
    cx = PX + 12
    # Las alas baten: se ven anchas y se ven de canto.
    flap = abs(math.sin(t * math.tau))
    w = 1.6 + flap * 5.4
    ala = (232, 178, 96, 255)
    ala_hi = (246, 214, 150, 255)
    borde = (176, 118, 64, 255)
    cuerpo = (64, 50, 42, 255)
    for sign in (-1, 1):
        x = cx + sign * (w * 0.55 + 2.0)
        ell(d, x, g - 10, w, 4.4, ala)             # ala de arriba
        ell(d, x, g - 5, w * 0.72, 3.0, borde)     # ala de abajo
        ell(d, x, g - 11, w * 0.42, 1.6, ala_hi)   # el brillito
        ell(d, x + sign * w * 0.3, g - 9, 1.2, 1.2, borde)   # la manchita
    # El cuerpo y las antenas van al final y bien marcados: si no, a este
    # tamaño la mariposa se lee como dos manchas y nada mas.
    d.rectangle([cx - 1.2, g - 12, cx + 1.2, g - 2], fill=cuerpo)
    ell(d, cx, g - 12.5, 1.8, 1.8, cuerpo)
    for sign in (-1, 1):
        d.line([(cx + sign * 0.5, g - 13), (cx + sign * 3.4, g - 17)], fill=cuerpo, width=1)
        ell(d, cx + sign * 3.4, g - 17, 1.0, 1.0, cuerpo)


def prop_bird(d, t, P, posado=False):
    """
    Un pajarito. Como la mariposa, se dibuja apoyado en la linea del piso de la
    celda: volando el motor lo lleva por el aire, posado se apoya de verdad.
    """
    g = PROP_GROUND
    cx = PX + 12
    cuerpo = (104, 132, 172, 255)
    claro = (152, 180, 212, 255)
    panza = (240, 234, 218, 255)
    pico = (232, 168, 80, 255)
    ojo = (36, 34, 42, 255)

    if posado:
        salto = abs(math.sin(t * math.tau * 2)) * 1.4     # picotea
        ell(d, cx - 1, g - 7, 5.6, 4.6, cuerpo)
        ell(d, cx - 1.5, g - 6, 3.8, 3.0, panza)
        d.polygon([(cx - 6, g - 8), (cx - 12, g - 4), (cx - 5, g - 5)], fill=cuerpo)
        ell(d, cx - 2, g - 8, 3.0, 2.0, claro)            # ala plegada
        ell(d, cx + 4, g - 11 + salto, 3.4, 3.2, cuerpo)  # cabeza
        d.polygon([(cx + 6.2, g - 12 + salto), (cx + 9.6, g - 10.5 + salto),
                   (cx + 6.2, g - 9 + salto)], fill=pico)
        ell(d, cx + 5, g - 12 + salto, 0.9, 0.9, ojo)
        for lx in (cx - 2, cx + 1):
            d.line([(lx, g - 3), (lx, g - 0.5)], fill=pico)
    else:
        # Volando. El ala de arriba y la de abajo se cruzan con el aleteo.
        flap = math.sin(t * math.tau)
        ell(d, cx - 1, g - 9, 5.4, 4.0, cuerpo)
        ell(d, cx - 1.5, g - 8, 3.6, 2.6, panza)
        d.polygon([(cx - 6, g - 10), (cx - 12, g - 6 - flap * 2), (cx - 5, g - 7)],
                  fill=cuerpo)                                   # cola
        ell(d, cx + 4, g - 12, 3.2, 3.0, cuerpo)                 # cabeza
        d.polygon([(cx + 6.2, g - 13), (cx + 9.6, g - 11.5), (cx + 6.2, g - 10)],
                  fill=pico)
        ell(d, cx + 5, g - 13, 0.9, 0.9, ojo)
        d.polygon([(cx - 2, g - 10), (cx + 2, g - 11 - flap * 7),
                   (cx + 5, g - 9)], fill=claro)                 # ala
        d.polygon([(cx - 2, g - 9), (cx + 1, g - 8 + flap * 5),
                   (cx + 4, g - 8)], fill=cuerpo)


def prop_ball(d, t, P):
    """Pelotita que rota: el brillo se mueve."""
    ang = t * math.tau
    ell(d, PX + 12, 14, 6, 6, (208, 92, 96, 255))
    hx = PX + 12 + math.cos(ang) * 2.6
    hy = 14 + math.sin(ang) * 2.6
    ell(d, hx, hy, 1.8, 1.8, (240, 168, 170, 255))


def prop_treat(d, t, P):
    """Un pescadito. El premio."""
    bob = math.sin(t * math.tau) * 0.6
    y = 15 + bob
    body = (226, 150, 118, 255)
    ell(d, PX + 11, y, 6, 3.4, body)
    d.polygon([(PX + 16.5, y), (PX + 21, y - 3.4), (PX + 21, y + 3.4)], fill=body)
    d.polygon([(PX + 10, y - 3), (PX + 13, y - 5.5), (PX + 14, y - 2.6)],
              fill=(206, 126, 96, 255))
    ell(d, PX + 7.5, y - 0.8, 0.9, 0.9, (74, 62, 56, 255))                # ojo
    d.line([(PX + 9, y + 1.4), (PX + 14, y + 1.4)], fill=(206, 126, 96, 255))


# La cama va partida en dos: el fondo se dibuja detras de ella y el borde de
# adelante por encima, asi queda metida ADENTRO y no parada sobre la cama.
BED_CX, BED_CY, BED_RX, BED_RY = 20, 14.0, 18.5, 7.0
BED_BOX = [BED_CX - BED_RX, BED_CY - BED_RY, BED_CX + BED_RX, BED_CY + BED_RY]


# El almohadon: el hueco donde se acuesta. El borde de adelante se recorta con
# esta misma elipse, asi su canto interno queda curvo y no una linea recta.
BED_IN_BOX = [BED_CX - 13.0, BED_CY - 5.0, BED_CX + 13.0, BED_CY + 3.4]


def prop_bed_back(d, t, P):
    """El fondo de su cama: el rodete de atras y el hueco donde se acuesta."""
    ell(d, BED_CX, BED_CY, BED_RX, BED_RY, BED_RIM)
    d.pieslice(BED_BOX, 180, 360, fill=BED_RIM_HI)       # luz en el borde de atras
    # Unos pocos mechones arriba: lo justo para que lea de tela y no de loza,
    # que si no se confunde con el plato de comida.
    fluff(d, BED_CX, BED_CY, BED_RX, BED_RY, BED_RIM_HI,
          n=14, amp=1.1, a0=math.pi + 0.35, a1=math.tau - 0.35)
    # El almohadon: sombra abajo del rodete y encima el relleno iluminado, para
    # que se lea mullido y no como un hueco vacio.
    d.ellipse(BED_IN_BOX, fill=BED_IN_SH)
    ell(d, BED_CX, BED_CY - 0.2, 12.0, 3.4, BED_IN)


def prop_bed_front(d, t, P):
    """El borde de adelante. Va POR ENCIMA de ella: es lo que la mete adentro."""
    d.pieslice(BED_BOX, 0, 180, fill=BED_RIM)
    d.pieslice([BED_CX - 15.5, BED_CY - 2.0, BED_CX + 15.5, BED_CY + 5.2],
               0, 180, fill=BED_RIM_HI)
    # Le comemos el almohadon de arriba: queda un canto curvo, mas fino en el
    # medio y mas grueso en las puntas, como se ve un rodete de frente.
    d.ellipse(BED_IN_BOX, fill=(0, 0, 0, 0))


PROPS = [
    ("bowl_empty", lambda d, t, P: prop_bowl(d, t, P, False), 1, 1, False),
    ("bowl_full",  lambda d, t, P: prop_bowl(d, t, P, True),  1, 1, False),
    ("water_full", lambda d, t, P: prop_water(d, t, P, True),  4, 3,  True),
    ("water_empty", lambda d, t, P: prop_water(d, t, P, False), 1, 1,  False),
    ("butterfly",  prop_butterfly,                             6, 12, True),
    ("bird",       lambda d, t, P: prop_bird(d, t, P, False),  6, 11, True),
    ("bird_perch", lambda d, t, P: prop_bird(d, t, P, True),   6, 4,  True),
    ("ball",       prop_ball,                                  6, 10, True),
    ("treat",      prop_treat,                                 4, 5,  True),
    ("bed_back",   prop_bed_back,                              1, 1,  False),
    ("bed_front",  prop_bed_front,                             1, 1,  False),
]


# ------------------------------------------------------------------- su casa
#
# Los muebles no entran en la celda de los objetos: el arbol es mas alto que
# ella. Van en su propia hoja, con su celda y su linea de piso.
#
# Lo importante: el arbol y el rascador declaran sus TABLAS aca, al lado del
# dibujo, y salen escritas en el json. El motor las lee de ahi y las convierte
# en superficies del mundo, asi que las medidas viven en un solo lugar: si se
# mueve una tabla en el dibujo, se mueve tambien donde ella se para.

FURN_W = 80         # ancho de la celda de muebles
FURN_H = 112        # alto: el arbol ocupa casi toda
FURN_GROUND = 108   # la linea del piso dentro de la celda

WOOD = (146, 108, 74, 255)
WOOD_HI = (176, 134, 96, 255)
WOOD_SH = (112, 82, 56, 255)

# ---- los colores de los otros habitats ----
GRASS    = (108, 148, 84, 255)
GRASS_HI = (138, 178, 106, 255)
GRASS_SH = (82, 116, 64, 255)
LEAF     = (94, 140, 82, 255)
LEAF_HI  = (124, 172, 104, 255)
LEAF_SH  = (70, 108, 62, 255)
PETAL    = (232, 168, 186, 255)
PETAL2   = (240, 210, 128, 255)
PLAS_B   = (92, 140, 190, 255)
PLAS_B_HI = (128, 174, 220, 255)
PLAS_B_SH = (64, 104, 150, 255)
PLAS_R   = (206, 96, 92, 255)
PLAS_Y   = (232, 190, 96, 255)
PLAS_G   = (110, 176, 128, 255)
CARTON   = (188, 152, 104, 255)
CARTON_HI = (214, 178, 128, 255)
CARTON_SH = (150, 118, 78, 255)
CIELO    = (150, 190, 216, 255)
NUBE     = (206, 228, 240, 255)
TELA     = (216, 196, 176, 255)
TELA_SH  = (188, 166, 146, 255)

CARPET = (168, 172, 182, 255)      # el gris peludo de los rascadores
CARPET_HI = (196, 200, 208, 255)
CARPET_SH = (132, 137, 148, 255)
SISAL = (198, 168, 112, 255)       # la soga del poste
SISAL_SH = (166, 138, 86, 255)
POM = (208, 92, 96, 255)           # el pompon que cuelga, del color de su pelota


def plank(d, x1, y1, x2, y2, base=WOOD, hi=WOOD_HI, sh=WOOD_SH):
    """Una tabla: su cara, una luz arriba y una sombra abajo."""
    d.rectangle([x1, y1, x2, y2], fill=base)
    d.rectangle([x1, y1, x2, y1 + 1], fill=hi)
    d.rectangle([x1, y2 - 1, x2, y2], fill=sh)


def carpet_pad(d, x1, y1, x2, y2):
    """Una tabla alfombrada, con el pelito del borde."""
    plank(d, x1, y1, x2, y2, CARPET, CARPET_HI, CARPET_SH)
    for x in range(int(x1), int(x2) + 1, 3):
        d.point((x, y1 - 1), fill=CARPET_HI)


def sisal_column(d, x1, y1, x2, y2):
    """El poste forrado en soga: las vueltas se ven como rayas horizontales."""
    d.rectangle([x1, y1, x2, y2], fill=SISAL)
    for y in range(int(y1), int(y2) + 1, 3):
        d.line([(x1, y), (x2, y)], fill=SISAL_SH)
    d.rectangle([x1, y1, x1 + 1, y2], fill=SISAL_SH)     # su lado en sombra


def hanging_pom(d, x, y_top, length=13):
    """El pompon que cuelga de una tabla, colgado de su piolin."""
    d.line([(x, y_top), (x, y_top + length)], fill=SISAL_SH)
    ell(d, x, y_top + length + 3, 3.2, 3.2, POM)
    ell(d, x - 1, y_top + length + 2, 1.1, 1.1, (240, 168, 170, 255))


def furn_post(d, t, P):
    """
    Su rascadero: base, poste de soga y una tabla arriba para sentarse. Va mas
    bajo que el arbol a proposito: el arbol tiene que ser el grande.
    """
    plank(d, 22, 100, 58, FURN_GROUND)          # base
    sisal_column(d, 34, 52, 46, 100)            # el poste
    carpet_pad(d, 24, 44, 56, 52)               # la tabla de arriba
    hanging_pom(d, 52, 52)


def furn_tree(d, t, P):
    """
    Su casa arbol: base, tronco de soga, una tabla baja, la casita con su
    puerta redonda y la tabla de arriba, que es desde donde vigila todo.
    """
    plank(d, 14, 101, 66, FURN_GROUND)          # base
    sisal_column(d, 36, 30, 48, 101)            # tronco

    # la casita, a media altura
    plank(d, 42, 56, 78, 84)
    d.rectangle([44, 58, 76, 82], fill=WOOD_SH)          # su interior en sombra
    plank(d, 42, 56, 78, 58)                             # el techo, mas claro
    ell(d, 60, 71, 9.5, 9.5, WOOD_HI)                    # el marco de la puerta
    ell(d, 60, 71, 8.0, 8.0, (52, 40, 32, 255))          # y su hueco oscuro

    carpet_pad(d, 6, 76, 46, 84)                # tabla baja
    carpet_pad(d, 12, 24, 60, 32)               # tabla de arriba
    hanging_pom(d, 66, 32, 16)


def furn_cave(d, t, P, front=False):
    """
    Su cueva. Va partida en dos: el fondo detras de ella y la cascara con la
    boca recortada por delante, asi se la ve ADENTRO, asomando por el agujero.
    """
    CX, CY, RX, RY = 40, 84, 32, 27
    # La boca tiene que darle lugar a ella ovillada adentro, si no le corta la
    # cabeza contra el borde de arriba.
    MOUTH = [CX - 20, CY - 4, CX + 20, CY + 25]

    if not front:
        # Lo que se ve por el agujero: la sombra de adentro y su almohadon.
        ell(d, CX, CY, RX, RY, (74, 78, 96, 255))
        d.ellipse(MOUTH, fill=(52, 55, 70, 255))
        ell(d, CX, CY + 22, 17, 5, BED_IN)
        return

    ell(d, CX, CY, RX, RY, BED_RIM)
    d.pieslice([CX - RX, CY - RY, CX + RX, CY + RY], 180, 360, fill=BED_RIM_HI)
    # Unos pocos mechones arriba: que lea de tela, igual que su cama, sin que
    # parezca peluda.
    fluff(d, CX, CY - 0.5, RX - 1.5, RY - 1.5, BED_RIM_HI, n=13, amp=1.1,
          a0=math.pi + 0.55, a1=math.tau - 0.55)
    # El reborde de la boca, un tono mas claro, y despues el agujero.
    d.ellipse([MOUTH[0] - 2, MOUTH[1] - 2, MOUTH[2] + 2, MOUTH[3] + 2], fill=BED_RIM_HI)
    d.ellipse(MOUTH, fill=(0, 0, 0, 0))


def furn_mouse(d, t, P):
    """Su ratoncito de trapo."""
    y = FURN_GROUND - 4
    body = (150, 146, 156, 255)
    d.line([(46, y + 1), (56, y - 3)], fill=(190, 150, 150, 255))     # la colita
    ell(d, 38, y, 8, 4.5, body)
    ell(d, 33, y - 1, 4.5, 4, body)                                   # la cabeza
    ell(d, 35, y - 4, 2.4, 2.4, (196, 154, 154, 255))                 # la oreja
    ell(d, 29.5, y - 0.5, 1.1, 1.1, (60, 52, 50, 255))                # el ojo
    ell(d, 28.5, y + 1.2, 1.2, 0.9, (206, 132, 132, 255))             # el hocico


def furn_pelotita(d, t, P, color=(228, 196, 88, 255), hi=(248, 228, 150, 255)):
    """Una pelotita chica de las que quedan tiradas por el piso."""
    y = FURN_GROUND - 4
    ell(d, 40, y, 4.2, 4.2, color)
    ell(d, 38.6, y - 1.4, 1.5, 1.5, hi)


def furn_wand(d, t, P):
    """La varita con plumas, apoyada contra la pared."""
    # El palito, de tres pixeles de grueso para que se vea de lejos.
    for off, c in ((-1, WOOD_SH), (0, WOOD), (1, WOOD_HI)):
        d.line([(26 + off, FURN_GROUND - 1), (52 + off, 66)], fill=c)
    # Las plumas, abiertas en abanico desde la punta.
    for dx, dy, c in ((1, -11, (226, 118, 126, 255)),
                      (9, -7, (120, 176, 190, 255)),
                      (-7, -6, (238, 206, 120, 255))):
        d.line([(52, 66), (52 + dx, 66 + dy)], fill=c)
        ell(d, 52 + dx, 66 + dy, 3.0, 3.4, c)
    ell(d, 52, 66, 2.0, 2.0, WOOD_SH)                 # el nudo donde se atan


# nombre, fn, frames, fps, loop, tablas donde se puede parar [x1, x2, y]
def furn_litter(d, t, P, front=False):
    """
    Su arenero. Va en dos partes como la cueva: el fondo detras de ella y el
    borde de adelante por encima, asi se la ve parada DENTRO y no arriba.
    """
    x1, x2 = 12, 68
    top = 84
    if not front:
        d.rectangle([x1, top, x2, FURN_GROUND - 2], fill=TRAY_SH)      # bandeja
        d.rectangle([x1, top, x2, top + 2], fill=TRAY_HI)              # canto
        d.rectangle([x1 + 3, top + 3, x2 - 3, FURN_GROUND - 4], fill=SAND)
        # grumitos
        for sx, sy, r in ((24, top + 8, 2.4), (41, top + 12, 2.8), (55, top + 7, 2.1)):
            ell(d, sx, sy, r, r * 0.65, SAND_SH)
        for sx, sy in ((31, top + 6), (48, top + 10), (60, top + 13)):
            ell(d, sx, sy, 1.3, 1.0, SAND_HI)
    else:
        d.rectangle([x1, FURN_GROUND - 11, x2, FURN_GROUND - 1], fill=TRAY)
        d.rectangle([x1, FURN_GROUND - 11, x2, FURN_GROUND - 9], fill=TRAY_HI)
        d.rectangle([x1, FURN_GROUND - 3, x2, FURN_GROUND - 1], fill=TRAY_SH)




# ------------------------------------------------------- el jardin


def furn_grass(d, t, P):
    """Piso de pasto. Se repite a lo ancho de toda la pantalla."""
    g = FURN_GROUND
    d.rectangle([0, g - 3, FURN_W, g], fill=GRASS_SH)
    for i in range(10):
        x = 2 + i * 8
        h = 6 + ((i * 37) % 9)
        d.polygon([(x - 2, g), (x + 0.5, g - h), (x + 2.5, g)], fill=GRASS)
        d.polygon([(x - 0.4, g), (x + 0.8, g - h + 2.5), (x + 1.6, g)], fill=GRASS_HI)


def furn_garden_tree(d, t, P):
    """Un arbol de verdad. La rama baja le sirve de tabla."""
    plank(d, 34, 40, 46, FURN_GROUND - 2)
    d.polygon([(22, 58), (40, 50), (40, 58)], fill=WOOD_SH)      # la rama
    d.polygon([(24, 56), (40, 51), (40, 55)], fill=WOOD)
    for cx, cy, r in ((40, 32, 21), (24, 44, 13), (56, 44, 13), (40, 17, 14)):
        ell(d, cx, cy, r, r * 0.82, LEAF)
    for cx, cy, r in ((33, 24, 9), (49, 28, 8), (40, 11, 7)):
        ell(d, cx, cy, r, r * 0.75, LEAF_HI)
    ell(d, 28, 50, 7, 5, LEAF_SH)
    ell(d, 53, 50, 7, 5, LEAF_SH)


def furn_bush(d, t, P):
    g = FURN_GROUND
    for cx, cy, rx, ry in ((28, g - 12, 16, 12), (52, g - 10, 14, 10), (40, g - 21, 13, 10)):
        ell(d, cx, cy, rx, ry, LEAF)
    for cx, cy, r in ((23, g - 17, 6), (46, g - 24, 5), (58, g - 14, 5)):
        ell(d, cx, cy, r, r * 0.8, LEAF_HI)
    ell(d, 34, g - 5, 12, 4, LEAF_SH)


def furn_flowers(d, t, P):
    """Tres flores que se mecen."""
    g = FURN_GROUND
    sway = math.sin(t * math.tau) * 1.3
    for i, (x, col) in enumerate(((24, PETAL), (40, PETAL2), (56, PETAL))):
        top = g - 24 - (i % 2) * 6
        d.line([(x, g), (x + sway, top)], fill=GRASS_SH, width=2)
        ell(d, x + sway * 0.6, (g + top) / 2, 3, 2, LEAF)
        for a in range(5):
            ang = a / 5 * math.tau
            ell(d, x + sway + math.cos(ang) * 3.2, top + math.sin(ang) * 3.2, 2.3, 2.3, col)
        ell(d, x + sway, top, 1.9, 1.9, (250, 228, 152, 255))


def furn_watering_can(d, t, P):
    """La regadera."""
    g = FURN_GROUND
    body, hi, sh = (128, 160, 176, 255), (162, 192, 206, 255), (96, 124, 140, 255)
    d.rectangle([22, g - 24, 48, g - 2], fill=body)
    d.rectangle([22, g - 24, 48, g - 21], fill=hi)
    d.rectangle([22, g - 5, 48, g - 2], fill=sh)
    d.polygon([(48, g - 21), (66, g - 28), (69, g - 23), (50, g - 13)], fill=body)
    ell(d, 67, g - 25, 4, 3.2, hi)
    d.arc([24, g - 36, 44, g - 20], 180, 360, fill=sh, width=2)


# --------------------------------------------------- el parque de juegos


def furn_tunnel(d, t, P, front=False):
    """Tunel de tela. Como la cueva: el fondo detras y la boca por delante."""
    g = FURN_GROUND
    if not front:
        d.rectangle([6, g - 36, 74, g - 2], fill=PLAS_B_SH)
        for i in range(5):                                   # los aros de la tela
            x = 10 + i * 15
            d.rectangle([x, g - 36, x + 4, g - 2], fill=PLAS_B)
        ell(d, 40, g - 19, 19, 16, (38, 52, 68, 255))        # el hueco
    else:
        # El aro de adelante, y solo la mitad de abajo: asi se la ve metida
        # adentro y no tapada por el tunel entero.
        ell(d, 40, g - 19, 22, 19, PLAS_B_HI)
        ell(d, 40, g - 19, 17, 14, (0, 0, 0, 0))
        d.rectangle([0, 0, FURN_W, g - 19], fill=(0, 0, 0, 0))


def furn_slide(d, t, P):
    """El tobogan: escalerita, plataforma arriba y la rampa."""
    g = FURN_GROUND
    d.rectangle([8, 48, 12, g - 2], fill=PLAS_B_SH)
    d.rectangle([34, 48, 38, g - 2], fill=PLAS_B_SH)
    for y in (62, 76, 90):
        plank(d, 10, y, 36, y + 4, PLAS_Y, (246, 216, 140, 255), (196, 154, 68, 255))
    plank(d, 6, 44, 42, 50, PLAS_B, PLAS_B_HI, PLAS_B_SH)     # la plataforma
    d.polygon([(40, 46), (74, g - 8), (74, g - 2), (40, 52)], fill=PLAS_R)
    d.polygon([(40, 46), (74, g - 8), (71, g - 8), (40, 49)], fill=(236, 140, 132, 255))


def furn_ballpit(d, t, P, front=False):
    """
    El pelotero. Como la caja, en dos partes: se mete adentro y le asoma la
    cabeza por encima de las pelotas.
    """
    g = FURN_GROUND
    cols = (PLAS_R, PLAS_Y, PLAS_B, (196, 140, 200, 255))
    if not front:
        d.rectangle([8, g - 24, 72, g - 2], fill=(78, 138, 96, 255))
        d.rectangle([8, g - 24, 72, g - 21], fill=PLAS_G)
        # las pelotas del fondo
        for i in range(5):
            x = 15 + i * 13
            ell(d, x, g - 19, 5, 5, cols[i % 4])
            ell(d, x - 1.6, g - 20.6, 1.6, 1.6, (252, 250, 246, 255))
    else:
        # el borde de adelante, bajo, con su hilera de pelotas
        d.rectangle([8, g - 13, 72, g + 6], fill=PLAS_G)
        d.rectangle([8, g - 13, 72, g - 10], fill=(150, 206, 166, 255))
        d.rectangle([8, g + 3, 72, g + 6], fill=(78, 138, 96, 255))
        for i in range(6):
            x = 12 + i * 11
            ell(d, x, g - 13, 5, 5, cols[(i + 2) % 4])
            ell(d, x - 1.6, g - 14.6, 1.6, 1.6, (252, 250, 246, 255))


def furn_rope(d, t, P):
    """Una cuerda colgando, con su nudo."""
    sway = math.sin(t * math.tau) * 2.2
    pts = bezier((40, 2), (40 + sway, 40), (40 + sway * 2, 72))
    for i, (x, y) in enumerate(pts):
        ell(d, x, y, 2.3, 2.3, (198, 168, 120, 255) if i % 2 else (170, 142, 98, 255))
    ex, ey = pts[-1]
    ell(d, ex, ey + 3, 4.6, 4.4, (186, 156, 108, 255))
    ell(d, ex - 1.4, ey + 2, 1.6, 1.6, (214, 186, 140, 255))


def furn_box(d, t, P, front=False):
    """
    La caja de carton. Va en dos partes y la de adelante es BAJA a proposito:
    se mete adentro y le tiene que asomar la cabeza, que es la gracia.
    """
    g = FURN_GROUND
    if not front:
        # la solapa de atras, abierta hacia afuera
        d.polygon([(10, g - 36), (20, g - 48), (62, g - 48), (72, g - 36)], fill=CARTON_HI)
        d.polygon([(14, g - 37), (24, g - 46), (58, g - 46), (68, g - 37)], fill=CARTON)
        # el cuerpo y el interior en sombra
        d.rectangle([10, g - 36, 72, g - 2], fill=CARTON_SH)
        d.rectangle([14, g - 33, 68, g - 6], fill=(118, 90, 58, 255))
        d.rectangle([14, g - 33, 68, g - 30], fill=(96, 72, 46, 255))
    else:
        # la pared de adelante, baja
        d.rectangle([10, g - 19, 72, g + 6], fill=CARTON)
        d.rectangle([10, g - 19, 72, g - 16], fill=CARTON_HI)
        d.rectangle([10, g + 3, 72, g + 6], fill=CARTON_SH)
        d.line([(41, g - 16), (41, g + 3)], fill=CARTON_SH)
        # las solapas de adelante, caidas hacia los costados
        d.polygon([(10, g - 19), (1, g - 32), (9, g - 33), (19, g - 19)], fill=CARTON_HI)
        d.polygon([(72, g - 19), (81, g - 32), (73, g - 33), (63, g - 19)], fill=CARTON_HI)


# ----------------------------------------------------- la ventana al sol


def furn_window(d, t, P):
    """La ventana con el cielo. Va detras de todo."""
    d.rectangle([6, 8, 74, 76], fill=CIELO)
    ell(d, 24, 26, 10, 6, NUBE)
    ell(d, 34, 23, 8, 5, NUBE)
    ell(d, 56, 40, 7, 4, NUBE)
    for x in (6, 38, 70):
        d.rectangle([x, 4, x + 4, 78], fill=WOOD)
    for y in (4, 38, 74):
        d.rectangle([6, y, 74, y + 4], fill=WOOD)
    d.rectangle([6, 4, 74, 6], fill=WOOD_HI)


def furn_sill(d, t, P):
    """La repisa de la ventana. Se sube y se echa al sol."""
    plank(d, 2, 58, 78, 68)
    plank(d, 14, 68, 66, FURN_GROUND - 2, WOOD_SH, WOOD, (92, 66, 44, 255))


def furn_potted_plant(d, t, P):
    g = FURN_GROUND
    pot, pot_hi = (176, 112, 84, 255), (200, 136, 104, 255)
    d.polygon([(28, g - 18), (52, g - 18), (48, g - 2), (32, g - 2)], fill=pot)
    d.rectangle([26, g - 22, 54, g - 17], fill=pot_hi)
    for cx, cy, r in ((31, g - 29, 8), (49, g - 27, 7), (40, g - 36, 8)):
        ell(d, cx, cy, r, r * 0.85, LEAF)
    ell(d, 36, g - 36, 4, 3.2, LEAF_HI)
    ell(d, 47, g - 30, 3.4, 2.6, LEAF_HI)


def furn_curtain(d, t, P):
    """La cortina, que se mueve apenas."""
    sway = math.sin(t * math.tau) * 1.6
    for i in range(5):
        x = 4 + i * 7
        d.polygon([(x, 2), (x + 6, 2), (x + 6 + sway, 92), (x + sway, 92)],
                  fill=TELA if i % 2 else TELA_SH)


FURNITURE = [
    ("litter_back",  lambda d, t, P: furn_litter(d, t, P, False), 1, 1, False, []),
    ("litter_front", lambda d, t, P: furn_litter(d, t, P, True),  1, 1, False, []),
    ("post",       furn_post,                                   1, 1, False, [[24, 56, 44]]),
    ("tree",       furn_tree,                                   1, 1, False,
     [[6, 46, 76], [42, 78, 56], [12, 60, 24]]),
    ("cave_back",  lambda d, t, P: furn_cave(d, t, P, False),    1, 1, False, []),
    ("cave_front", lambda d, t, P: furn_cave(d, t, P, True),     1, 1, False, []),
    ("mouse",      furn_mouse,                                   1, 1, False, []),
    ("pelotita",   furn_pelotita,                                1, 1, False, []),
    ("pelotita2",  lambda d, t, P: furn_pelotita(
        d, t, P, (128, 180, 194, 255), (176, 216, 226, 255)),     1, 1, False, []),
    ("wand",       furn_wand,                                    1, 1, False, []),

    # --- el jardin ---
    ("grass",        furn_grass,                                1, 1,  False, []),
    ("garden_tree",  furn_garden_tree,                          1, 1,  False, [[22, 40, 56]]),
    ("bush",         furn_bush,                                 1, 1,  False, []),
    ("flowers",      furn_flowers,                              6, 3,  True,  []),
    ("watering_can", furn_watering_can,                         1, 1,  False, []),

    # --- el parque de juegos ---
    ("tunnel_back",  lambda d, t, P: furn_tunnel(d, t, P, False), 1, 1, False, []),
    ("tunnel_front", lambda d, t, P: furn_tunnel(d, t, P, True),  1, 1, False, []),
    ("slide",        furn_slide,                                1, 1,  False, [[6, 42, 44]]),
    ("ballpit_back", lambda d, t, P: furn_ballpit(d, t, P, False), 1, 1, False, []),
    ("ballpit_front", lambda d, t, P: furn_ballpit(d, t, P, True), 1, 1, False, []),
    ("rope",         furn_rope,                                 6, 4,  True,  []),
    ("box_back",     lambda d, t, P: furn_box(d, t, P, False),  1, 1,  False, []),
    ("box_front",    lambda d, t, P: furn_box(d, t, P, True),   1, 1,  False, []),

    # --- la ventana al sol ---
    ("window",       furn_window,                               1, 1,  False, []),
    ("sill",         furn_sill,                                 1, 1,  False, [[2, 78, 58]]),
    ("potted_plant", furn_potted_plant,                         1, 1,  False, []),
    ("curtain",      furn_curtain,                              6, 3,  True,  []),
]


def build_furniture(P, out_png, out_json):
    rows = len(FURNITURE)
    sheet = Image.new("RGBA", (FURN_W, rows * FURN_H), (0, 0, 0, 0))
    meta = {"cell": [FURN_W, FURN_H], "ground": FURN_GROUND, "animations": {}}

    for row, (name, fn, nframes, fps, loop, ledges) in enumerate(FURNITURE):
        cell = Image.new("RGBA", (FURN_W, FURN_H), (0, 0, 0, 0))
        fn(ImageDraw.Draw(cell), 0.0, P)
        cell = add_outline(cell, P["outline"])
        sheet.paste(cell, (0, row * FURN_H), cell)
        meta["animations"][name] = {
            "row": row, "frames": nframes, "fps": fps, "loop": loop, "ledges": ledges
        }

    sheet.save(out_png)
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"muebles-> {out_png}  ({rows} piezas)")


def build_props(P, out_png, out_json):
    cols = max(p[2] for p in PROPS)
    rows = len(PROPS)
    sheet = Image.new("RGBA", (cols * PROP_CELL, rows * PROP_CELL), (0, 0, 0, 0))
    meta = {"cell": [PROP_CELL, PROP_CELL], "ground": PROP_GROUND, "animations": {}}

    for row, (name, fn, nframes, fps, loop) in enumerate(PROPS):
        for i in range(nframes):
            cell = Image.new("RGBA", (PROP_CELL, PROP_CELL), (0, 0, 0, 0))
            d = ImageDraw.Draw(cell)
            fn(d, i / nframes, P)
            cell = add_outline(cell, P["outline"])
            sheet.paste(cell, (i * PROP_CELL, row * PROP_CELL), cell)
        meta["animations"][name] = {"row": row, "frames": nframes, "fps": fps, "loop": loop}

    sheet.save(out_png)
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"props  -> {out_png}  ({rows} objetos)")


def build_look(look, palette_path, out_dir):
    """Dibuja una version entera: su hoja de sprites, sus objetos y su icono."""
    global MARKS, EYE

    pal = dict(look["palette"])
    if palette_path and os.path.exists(palette_path):
        with open(palette_path) as f:
            pal.update(json.load(f).get("roles", {}))

    P = {k: hex2rgba(v) for k, v in pal.items()}

    # De aca leen las poses que rasgos les toca dibujar.
    MARKS = dict(look.get("marks") or {})
    EYE = EYE_SETS[look.get("eyes", "normal")]

    out_png = os.path.join(out_dir, "cat.png")
    out_json = os.path.join(out_dir, "cat.json")

    cols = max(a[2] for a in ANIMATIONS)
    rows = len(ANIMATIONS)
    sheet = Image.new("RGBA", (cols * CELL, rows * CELL), (0, 0, 0, 0))

    meta = {
        "cell": [CELL, CELL],
        "ground": GROUND,
        "look": look["id"],
        "label": look["label"],
        "marks": MARKS,
        "palette": pal,
        "eye": EYE["engine"][bool(MARKS.get("eyeRing"))],
        "animations": {},
    }

    for row, (name, fn, nframes, fps, loop) in enumerate(ANIMATIONS):
        eyes_per_frame = []
        for i in range(nframes):
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            d = ImageDraw.Draw(cell)
            EYE_MARKS.clear()
            fn(d, i / nframes, P)
            eyes_per_frame.append(list(EYE_MARKS))
            cell = add_outline(cell, P["outline"])
            sheet.paste(cell, (i * CELL, row * CELL), cell)
        meta["animations"][name] = {
            "row": row, "frames": nframes, "fps": fps, "loop": loop,
            "eyes": eyes_per_frame
        }

    os.makedirs(out_dir, exist_ok=True)
    sheet.save(out_png)
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[{look['id']}] hoja    -> {out_png}  "
          f"({sheet.width}x{sheet.height}, {rows} animaciones)")

    build_props(P, os.path.join(out_dir, "props.png"),
                os.path.join(out_dir, "props.json"))
    build_furniture(P, os.path.join(out_dir, "furniture.png"),
                    os.path.join(out_dir, "furniture.json"))
    # Cada version tiene su propio icono de bandeja, asi cambiar de pinta
    # tambien le cambia la carita del tray.
    build_icons(sheet, out_dir, full=False)
    return sheet


def build(palette_path, sprites_dir, only=None):
    """Todas las versiones, cada una en su carpeta, mas el indice que lee la app."""
    looks = [lk for lk in LOOKS if only in (None, lk["id"])]
    if not looks:
        raise SystemExit(f"no conozco la version '{only}'. "
                         f"Hay: {', '.join(lk['id'] for lk in LOOKS)}")

    sheets = {}
    for look in looks:
        sheets[look["id"]] = build_look(
            look, palette_path, os.path.join(sprites_dir, look["id"]))

    # De aca saca la app la lista para el menu de bandeja. Va con TODAS las
    # versiones, no solo las que se acaban de dibujar.
    index_path = os.path.join(sprites_dir, "looks.json")
    os.makedirs(sprites_dir, exist_ok=True)
    with open(index_path, "w") as f:
        json.dump({
            "default": DEFAULT_LOOK,
            "looks": [{"id": lk["id"], "label": lk["label"]} for lk in LOOKS],
        }, f, indent=2)
    print(f"indice  -> {index_path}  ({len(LOOKS)} versiones)")

    # El icono de la bandeja y el del instalador salen de la version por defecto.
    base = sheets.get(DEFAULT_LOOK) or next(iter(sheets.values()))
    build_icons(base, os.path.dirname(sprites_dir), full=True)


def build_icons(sheet, out_dir, full=True):
    """
    Icono de bandeja y de la app, sacados de su pose sentada.
    Sin tray.png Electron crea un icono vacio y el menu queda inalcanzable.
    """
    cell = sheet.crop((0, 0, CELL, CELL))          # idle, frame 0
    bbox = cell.getbbox()
    if bbox:
        cell = cell.crop(bbox)

    # Centrar en un cuadrado con un poco de aire.
    side = max(cell.width, cell.height) + 4
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2), cell)

    os.makedirs(out_dir, exist_ok=True)
    tray = square.resize((44, 44), Image.NEAREST)
    tray.save(os.path.join(out_dir, "tray.png"))
    if not full:
        return

    icon = square.resize((side * 12, side * 12), Image.NEAREST).resize((512, 512), Image.NEAREST)
    icon.save(os.path.join(out_dir, "icon.png"))

    print(f"iconos  -> {out_dir}/tray.png (44x44), {out_dir}/icon.png (512x512)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--palette", default=os.path.join(root, "config/palette.json"))
    ap.add_argument("--sprites", default=os.path.join(root, "assets/sprites"),
                    help="carpeta donde va una subcarpeta por version")
    ap.add_argument("--look", default=None,
                    help="dibujar solo esa version (por defecto, todas)")
    a = ap.parse_args()
    build(a.palette, a.sprites, a.look)
