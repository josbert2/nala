#!/usr/bin/env python3
"""
Generador parametrico de sprites de gata.

Dibuja una hoja de sprites pixel-art (una fila por animacion) a partir de una
paleta de colores. La paleta se puede extraer de fotos reales con
tools/photo_palette.py, asi el sprite queda con SU pelaje.

Uso:
    python3 tools/make_sprites.py
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
}

# ---------------------------------------------------------------- primitivas


def ell(d, cx, cy, rx, ry, fill):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)


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


def head(d, cx, cy, P, eyes="open", tilt=0.0):
    """
    Su cabeza: gorro gris tabby arriba, blaze blanco al medio de la frente,
    melena de pelo largo alrededor, orejas rosas por dentro.
    """
    # melena: mechones que rodean toda la cabeza
    fluff(d, cx, cy + 0.5, 8.3, 7.3, P["base"], n=15, amp=1.8)

    # orejas: grises por fuera, rosas por dentro, con mechon en la punta
    for sign, ox in ((-1, -5), (1, 5)):
        bx = cx + ox
        tipx = bx + 1 + sign * tilt * 2
        tipy = cy - 12 + abs(tilt)
        d.polygon([(bx - 3.2, cy - 4), (tipx, tipy), (bx + 3.2, cy - 3)], fill=P["dark"])
        d.polygon([(bx - 1.2, cy - 5), (tipx + sign * 0.4, tipy + 3.0), (bx + 1.8, cy - 4)],
                  fill=P["pink"])

    # craneo
    ell(d, cx, cy, 8, 7, P["base"])

    # el gorro gris, que le baja hasta la altura de los ojos
    d.pieslice([cx - 8, cy - 6.5, cx + 8, cy + 7.5], 182, 358, fill=P["dark"])

    # el blaze blanco que le baja por el medio de la frente
    d.polygon([(cx - 2.5, cy + 1.5), (cx - 0.2, cy - 7.4), (cx + 2.5, cy + 1.5)], fill=P["light"])

    # cachetes de pelo largo (solo la mitad de abajo, para no comerse el gorro)
    fluff(d, cx, cy + 1.5, 8.1, 6.4, P["base"], n=9, amp=1.7, a0=0.25, a1=math.pi - 0.25)

    # hocico
    ell(d, cx + 1, cy + 3.6, 5.2, 3.5, P["light"])

    # ojos
    if eyes == "open":
        for ex in (cx - 3.6, cx + 3.6):
            ell(d, ex, cy - 0.4, 2.0, 2.2, P["eye"])
            ell(d, ex, cy - 0.4, 0.75, 1.7, P["outline"])       # pupila
            ell(d, ex - 0.8, cy - 1.7, 0.55, 0.55, P["light"])  # brillo
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
    tail(d, (14, GROUND - 3), (5, GROUND - 12), (13, GROUND - 18), P["dark"])
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])          # cuerpo
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])       # pecho
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])      # patas delanteras
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22 + bob, P)


def pose_idle(d, t, P):
    """Igual que sit pero parpadea."""
    frame = int(t * 4) % 4
    bob = math.sin(t * math.tau) * 0.7
    tail_lift = math.sin(t * math.tau * 2) * 3
    tail(d, (14, GROUND - 3), (5, GROUND - 12 - tail_lift), (13, GROUND - 18), P["dark"])
    ell(d, 20, GROUND - 8 + bob, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4 + bob, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11 + bob, 8, 7, P)
    leg(d, 24, GROUND - 9 + bob, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9 + bob, GROUND - 1, P["base"])
    head(d, 27, GROUND - 22 + bob, P, eyes="closed" if frame == 3 else "open")


def pose_walk(d, t, P):
    """Perfil caminando a la derecha, 4 fases de patas."""
    ph = t * math.tau
    swing_f = math.sin(ph) * 3.5
    swing_b = math.sin(ph + math.pi) * 3.5
    bob = abs(math.sin(ph)) * 1.2

    tail(d, (10, GROUND - 12 + bob), (3, GROUND - 20), (9, GROUND - 26 - swing_f), P["dark"])
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
    head(d, 31, GROUND - 20 + bob, P)


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
    head(d, 33, GROUND - 20 + bob, P, eyes="half")


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


def pose_groom(d, t, P):
    """Sentada lamiendose la pata."""
    ph = t * math.tau
    lick = math.sin(ph) * 2
    tail(d, (14, GROUND - 3), (5, GROUND - 11), (12, GROUND - 17), P["dark"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    # pata levantada hacia la cara
    d.rectangle([27, GROUND - 20 + lick, 31, GROUND - 8], fill=P["base"])
    head(d, 27, GROUND - 22 + lick, P, eyes="closed", tilt=0.8)


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
    tail(d, (14, GROUND - 3), (5 + swat * 0.4, GROUND - 11), (13, GROUND - 18), P["dark"])
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    d.rectangle([28, GROUND - 18 - swat, 32, GROUND - 8 - swat * 0.3], fill=P["base"])
    ell(d, 30, GROUND - 18 - swat, 2.4, 2.0, P["base"])
    head(d, 27, GROUND - 22, P, eyes="open", tilt=0.3)


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


def pose_sit_alert(d, t, P):
    """Sentada, atenta, mirando al cursor. Orejas paradas, cola inquieta."""
    swish = math.sin(t * math.tau * 2) * 5
    tail(d, (14, GROUND - 3), (6 + swish, GROUND - 10), (14 + swish, GROUND - 20), P["dark"])
    ell(d, 20, GROUND - 8, 9, 9.5, P["base"])
    ell(d, 21, GROUND - 4, 6.5, 5.5, P["light"])
    stripes_body(d, 20, GROUND - 11, 8, 7, P)
    leg(d, 24, GROUND - 9, GROUND - 1, P["base"])
    leg(d, 28, GROUND - 9, GROUND - 1, P["base"])
    head(d, 27, GROUND - 23, P, eyes="open", tilt=-0.4)


ANIMATIONS = [
    # nombre,        fn,             frames, fps,  loop
    ("idle",         pose_idle,       8,     6,    True),
    ("sit",          pose_sit,        4,     4,    True),
    ("alert",        pose_sit_alert,  6,     8,    True),
    ("walk",         pose_walk,       8,     10,   True),
    ("run",          pose_run,        6,     14,   True),
    ("sleep",        pose_sleep,      6,     3,    True),
    ("groom",        pose_groom,      6,     6,    True),
    ("stretch",      pose_stretch,    6,     6,    False),
    ("fall",         pose_fall,       4,     10,   True),
    ("climb",        pose_climb,      6,     8,    True),
    ("eat",          pose_eat,        6,     7,    True),
    ("crouch",       pose_crouch,     6,     10,   True),
    ("pounce",       pose_pounce,     4,     12,   False),
    ("play",         pose_play,       6,     9,    True),
    ("slide",        pose_slide,      4,     12,   True),
]

# ------------------------------------------------------------------- objetos

PROP_CELL = 24


def prop_bowl(d, t, P, full=False):
    d.polygon([(3, 15), (21, 15), (18, 20), (6, 20)], fill=P["light"])   # cuerpo
    ell(d, 12, 15, 8, 2.4, P["light"])                                   # borde
    if full:
        ell(d, 12, 15, 6.0, 1.8, (150, 106, 70, 255))                    # comida
        ell(d, 10, 14, 1.6, 1.2, (176, 130, 88, 255))
        ell(d, 14, 15, 1.4, 1.1, (176, 130, 88, 255))
    else:
        ell(d, 12, 15.4, 6.0, 1.6, P["dark"])                            # hueco


def prop_ball(d, t, P):
    """Pelotita que rota: el brillo se mueve."""
    ang = t * math.tau
    ell(d, 12, 14, 6, 6, (208, 92, 96, 255))
    hx = 12 + math.cos(ang) * 2.6
    hy = 14 + math.sin(ang) * 2.6
    ell(d, hx, hy, 1.8, 1.8, (240, 168, 170, 255))


def prop_treat(d, t, P):
    """Un pescadito. El premio."""
    bob = math.sin(t * math.tau) * 0.6
    y = 15 + bob
    body = (226, 150, 118, 255)
    ell(d, 11, y, 6, 3.4, body)
    d.polygon([(16.5, y), (21, y - 3.4), (21, y + 3.4)], fill=body)   # cola
    d.polygon([(10, y - 3), (13, y - 5.5), (14, y - 2.6)], fill=(206, 126, 96, 255))
    ell(d, 7.5, y - 0.8, 0.9, 0.9, (74, 62, 56, 255))                # ojo
    d.line([(9, y + 1.4), (14, y + 1.4)], fill=(206, 126, 96, 255))


PROPS = [
    ("bowl_empty", lambda d, t, P: prop_bowl(d, t, P, False), 1, 1, False),
    ("bowl_full",  lambda d, t, P: prop_bowl(d, t, P, True),  1, 1, False),
    ("ball",       prop_ball,                                  6, 10, True),
    ("treat",      prop_treat,                                 4, 5,  True),
]


def build_props(P, out_png, out_json):
    cols = max(p[2] for p in PROPS)
    rows = len(PROPS)
    sheet = Image.new("RGBA", (cols * PROP_CELL, rows * PROP_CELL), (0, 0, 0, 0))
    meta = {"cell": [PROP_CELL, PROP_CELL], "ground": 21, "animations": {}}

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


def build(palette_path, out_png, out_json):
    pal = dict(DEFAULT_PALETTE)
    if palette_path and os.path.exists(palette_path):
        with open(palette_path) as f:
            pal.update(json.load(f).get("roles", {}))

    P = {k: hex2rgba(v) for k, v in pal.items()}

    cols = max(a[2] for a in ANIMATIONS)
    rows = len(ANIMATIONS)
    sheet = Image.new("RGBA", (cols * CELL, rows * CELL), (0, 0, 0, 0))

    meta = {
        "cell": [CELL, CELL],
        "ground": GROUND,
        "palette": pal,
        "animations": {},
    }

    for row, (name, fn, nframes, fps, loop) in enumerate(ANIMATIONS):
        for i in range(nframes):
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            d = ImageDraw.Draw(cell)
            fn(d, i / nframes, P)
            cell = add_outline(cell, P["outline"])
            sheet.paste(cell, (i * CELL, row * CELL), cell)
        meta["animations"][name] = {
            "row": row, "frames": nframes, "fps": fps, "loop": loop
        }

    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    sheet.save(out_png)
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"sheet  -> {out_png}  ({sheet.width}x{sheet.height}, {rows} animaciones)")
    print(f"meta   -> {out_json}")

    d = os.path.dirname(out_png)
    build_props(P, os.path.join(d, "props.png"), os.path.join(d, "props.json"))
    build_icons(sheet, os.path.dirname(d))


def build_icons(sheet, assets_dir):
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

    tray = square.resize((44, 44), Image.NEAREST)
    tray.save(os.path.join(assets_dir, "tray.png"))

    icon = square.resize((side * 12, side * 12), Image.NEAREST).resize((512, 512), Image.NEAREST)
    icon.save(os.path.join(assets_dir, "icon.png"))

    print(f"iconos -> {assets_dir}/tray.png (44x44), {assets_dir}/icon.png (512x512)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--palette", default=os.path.join(root, "config/palette.json"))
    ap.add_argument("--out", default=os.path.join(root, "assets/sprites/cat.png"))
    ap.add_argument("--meta", default=os.path.join(root, "assets/sprites/cat.json"))
    a = ap.parse_args()
    build(a.palette, a.out, a.meta)
