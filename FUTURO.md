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

## 3. Que los hábitats hagan más cosas

Los cuatro hábitats están, pero las piezas que necesitan lógica de movimiento
propia quedaron como decorado. Lo que falta:

- **La mariposa del jardín.** Una entidad que vuela sola y ella la persigue. El
  patrón ya existe: `Ball` en `src/renderer/engine/props.js` con su física, y
  `chaseBall` en `cat.js`. Sería una `Butterfly` con movimiento de vuelo en vez
  de gravedad, y un `chaseButterfly` que la sigue sin poder atraparla nunca —
  que es lo que pasa de verdad.
- **Deslizarse por el tobogán.** Hoy sube a la plataforma (la tabla está
  declarada en `furniture.json`) y baja de un salto. Falta un estado `sliding`
  que la lleve por la rampa: la rampa va de (40,46) a (74,g-8) en la celda, o
  sea una recta que se recorre interpolando. La animación `slide` ya existe.
- **La mancha de sol de la ventana.** Una zona en el piso que se corre con la
  hora real y donde ella prefiere echarse. `Routine.activity()` ya sabe la hora;
  sería una pieza con `x` calculada en vez de fija, y un empujón en `_decide`
  para que vaya ahí a dormir. Ojo: el sprite tendría que ir sin contorno, y
  `build_furniture()` se lo pone a todo — hay que agregarle una excepción.
- **Meterse en el pelotero.** Hoy es una cama (se duerme al lado). Podría ser
  como la caja: dos partes, y las pelotas moviéndose cuando entra.

---

## 4. Que salga a jugar con el mouse sola, cada tanto

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

## 5. Terminar el panel

El menu ya no es un menu: es un panel que entra desde el borde derecho del
monitor donde le hiciste click, con los grupos plegables de a uno por vez, y se
queda abierto hasta que lo cerras. Lo que le falta:

- **Iconitos por opcion.** Los sprites ya existen en
  `assets/sprites/<version>/props.png` y `furniture.png` (plato, pelota,
  pescadito, cama, rascadero) y se pueden recortar con la misma grilla que usa
  `SpriteSheet`, asi el panel queda del mismo mundo que ella.
- **Sus necesidades ahi adentro.** El panel tiene lugar de sobra y `needs.js` ya
  tiene los datos: unas barritas al pie lo volverian un panel de verdad. Hoy eso
  vive aparte, en el overlay de `#stats`.
- **Teclado.** Hoy no hay `Esc` ni navegacion con flechas, y no es un olvido: la
  ventana es `focusable: false` (lo necesita para no robarte el foco mientras
  trabajas), asi que los eventos de teclado no le llegan. Habria que registrar un
  atajo global en el proceso principal, como los de `SHORTCUTS`.
- **Que se acuerde de que grupo dejaste abierto** entre sesiones, no solo dentro
  de una. Iria en `settings.json`, al lado de `look` y `habitat`.

**Cuidado, lo mismo de siempre:** el panel vive dentro de una ventana que el
mouse atraviesa. `sendHotRects()` manda su rectangulo y por eso se puede
clickear. Dos cosas que ya costaron una vuelta:

- El rectangulo se mide con `getBoundingClientRect()`, **no** con `offsetLeft`:
  el panel entra con un `transform`, y `offsetLeft` no lo tiene en cuenta.
- El panel **no** fuerza la ventana solida entera (`force`), a proposito: si lo
  hiciera, con el panel abierto no podrias clickear nada de lo que tenes atras.
  Solo su franja agarra el mouse.
