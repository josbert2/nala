# Futuro

Cosas pedidas que todavía no están hechas. Anotadas con dónde tocar, para no
tener que volver a buscar.

---

## 1. Su ronroneo y su maullido de verdad

**Qué se quiere:** que suene ella. Hoy la app es muda: los `prrr` flotando son
un dibujo de un sonido, no el sonido.

**Qué hace falta:** un video o audio donde ronronee o maúlle. De ahí se saca el
audio (`ffmpeg -i video.mp4 -vn -acodec pcm_s16le audio.wav`), se recorta un
ronroneo limpio de 2–3 s que loopee sin costura, y un maullido corto.

**Dónde va:**

- Archivos en `assets/audio/` (`ronroneo.ogg`, `miau.ogg`). Ojo con la CSP de
  `src/renderer/index.html`: hay que agregarle `media-src 'self'`.
- Un módulo nuevo `src/renderer/engine/sound.js` con Web Audio: un loop con
  ganancia que sube y baja, no un `<audio>` suelto.
- Enganches: `maybePurr()` en `src/renderer/main.js` ya sabe exactamente cuándo
  ronronea (dormida o mientras la acarician) — ahí va el loop. El maullido va en
  `cat.meow()` y cuando `cat.asking` pasa a `'comida'` / `'agua'`.
- Volumen y un mute en el menú de bandeja, y guardarlo. Que arranque bajo:
  esto tiene que poder quedar abierto todo el día sin molestar.

**Por qué primero:** es lo de mayor retorno emocional y de los más baratos de
hacer. Todo lo demás es dibujo; esto es ella.

---

## 2. Sus fotos de verdad

**Qué se quiere:** que cada tanto aparezca una foto real suya, en un marquito,
unos segundos, y se vaya. Y poder pedirla desde el menú → "Verla".

**Qué hay hoy:** las herramientas están escritas y nunca se usaron —
`tools/photo_to_sprite.py` y `tools/photo_palette.py`. El sprite actual es una
interpretación de cuatro fotos, no las fotos.

**Dónde va:**

- Las fotos en `assets/fotos/`. Que el arranque las liste (o un `fotos.json`
  con un pie de foto opcional por cada una: dónde fue, cuándo).
- Un `<div>` nuevo en `src/renderer/index.html`, al lado de `#bubble` y
  `#stats`. El CSS del marco en `src/renderer/style.css`.
- El disparo puede colgarse de `Messages`: un grupo `foto` que en vez de texto
  devuelva una imagen. O su propio timer, más raleado que los mensajes.
- **Ojo con `sendHotRects()`**: si la foto es clickeable (para cerrarla o pasar
  a la siguiente), su rectángulo tiene que entrar ahí o el click se va a la
  ventana de atrás. Mismo problema que tuvo el menú.
- Que se pueda pausar. Una foto que aparece sin avisar un día malo puede ser
  demasiado — mejor que se pueda apagar desde el menú.

**Nota:** el pixel art es para que viva en el escritorio. Las fotos son para
verla. No compiten.

---

## 3. Que salga a jugar con el mouse sola, cada tanto

**Qué se quiere:** que de vez en cuando se ponga a seguir el cursor un rato,
como si estuvieras jugando con ella — sin que haya que provocarla.

**Qué hay hoy:** ya existe el estado `chaseCursor` en
`src/renderer/engine/cat.js`, pero solo arranca si la provocás a propósito.
En `_react()`:

```js
if (p.speed > 1500 && p.wiggle >= 4 && dist < 260 && this.energy > 0.28 &&
    performance.now() > this.huntCooldownUntil && ...)
```

O sea: pide zarandeo deliberado (4 cambios de dirección en 600ms), el cursor a
menos de 260px, y después se toma `HUNT_COOLDOWN` = 20s antes de volver a picar.
Ese filtro está puesto a propósito para que no salte mientras trabajás.

**Por dónde va la cosa:** no alcanza con aflojar ese `if` — si lo aflojás,
vuelve el problema que el filtro venía a resolver. Conviene un camino aparte:

- Una tirada nueva en `_decide()`, al lado de la excursión a otro monitor
  (buscar `_otherScreenTarget`), con su propio cooldown tipo `tripCooldownUntil`.
- Que solo enganche si el cursor está en **su** monitor y razonablemente cerca
  (`world.displayAt(this.x)`), si no la vas a ver corriendo sola en otra pantalla.
- Que dure un rato acotado y afloje: perseguir → manotazo → se cansa y se sienta.
  Encadenar `chaseCursor` → `crouch` → `pounce` → `play` ya funciona.
- Que respete la energía y que se corte sola si movés el cursor rápido a otro
  lado (no debería seguirte mientras laburás en serio).
- Ojo con `missYou()`/`seek`, que ya la hacen ir hacia el cursor por otro motivo:
  que no se pisen.

---

## 4. Un menú de click derecho más trabajado

**Qué se quiere:** que el menú sea más lindo y esté mejor terminado.

**Dónde está:**

- Estructura y comportamiento: `src/renderer/main.js` → `MENU_ITEMS`,
  `showMenu()`, `hideMenu()`.
- Estilo: `src/renderer/style.css` → `.menu` y `.menu button`.
- El nodo: `<div id="menu">` en `src/renderer/index.html`.

**Qué es hoy:** una caja oscura redondeada con botones de texto, que aparece con
un fade + scale de 130ms. Funciona, pero es lo mínimo.

**Se volvió más urgente:** con su casa ya son once opciones en una sola lista
plana (acariciarla, premio, pelota, comida, rascadero, árbol, cueva, juguete,
cama, dormir, cambiarle la pinta). Pide separadores o submenús.

**Ideas:**

- Iconitos por opción. Los sprites ya existen en `assets/sprites/<version>/props.png`
  (plato, pelota, pescadito, cama) — se pueden recortar con la misma grilla que
  usa `SpriteSheet`, así el menú queda del mismo mundo que ella.
- Un encabezado chiquito con su nombre y qué está haciendo ahora
  (`ACTION_LABELS` ya tiene los textos).
- Separadores entre "cosas que le das" (comida, pelota, premio) y "cosas que le
  pedís" (a su cama, que duerma).
- Que se abra hacia arriba o hacia la izquierda cuando está pegada a un borde,
  en vez de solo recortarse. El recorte por monitor ya está resuelto en
  `screenEdges()`, sirve de base.
- Navegación con teclado y `Esc` para cerrar.
- Que el hover se sienta: hoy es un cambio de fondo y nada más.

**Cuidado:** el menú vive dentro de una ventana que por defecto el mouse
atraviesa. Mientras está abierto, `sendHotRects()` manda su rectángulo y fuerza
la ventana sólida. Si le cambiás el tamaño o le agregás submenús, ese rectángulo
tiene que seguir siendo el correcto o los clicks se van a ir a la ventana de
atrás.
