# Nala

Nala vive en el escritorio. Camina, se sienta, se lame, duerme, come a sus horas,
juega con una pelota y se sube al borde de las ventanas abiertas.

Corre en **Linux** y en **Windows**. Es una app de Electron con una ventana
transparente del tamaño de la pantalla que el mouse atraviesa: solo se vuelve
sólida cuando el cursor está encima de ella o de su pelota.

---

## Correrla

```bash
npm install
npm start
```

Queda un ícono en el tray. Desde ahí: servirle la comida, sacarle la pelota,
llamarla, mandarla a su cama, hacerla dormir, esconderla o salir. También
**Su pinta**, para elegir qué versión de ella querés ver. Con más de un monitor
aparece además **Por dónde anda**, para dejarla en todas las pantallas o solo en
la principal.

En GNOME el ícono de bandeja depende de la extensión **AppIndicator**, que no
siempre está instalada. Por eso hay dos caminos que siempre funcionan:

**Atajos globales**

| Atajo | |
|---|---|
| `Ctrl+Alt+P` | sacar la pelota |
| `Ctrl+Alt+O` | darle un premio |
| `Ctrl+Alt+C` | servirle la comida |
| `Ctrl+Alt+L` | que venga |
| `Ctrl+Alt+K` | mandarla a su cama |
| `Ctrl+Alt+R` | que vaya a rascar el poste |
| `Ctrl+Alt+T` | que se suba al árbol |

**Click derecho sobre ella** abre el mismo menú ahí mismo.

### Interacción

| Acción | Qué hace |
|---|---|
| Click sobre ella | La acariciás. Ronronea y salen corazones. |
| Arrastrarla | La levantás y la soltás donde quieras. Cae con gravedad. |
| Click en la pelota | Se la pateás. Ella la persigue. |
| Doble click | Maúlla. |
| Zarandear el mouse cerca | Sale a cazar el cursor. Pide un zarandeo deliberado, no cualquier movimiento. |
| Click derecho sobre ella | Menú rápido. |

Cuando está jugando, comiendo o ronroneando aparece un tooltip chiquito arriba
de ella diciendo qué está haciendo.

Mientras duerme no hay tooltip: le salen **prrr** flotando, que se van haciendo
más largos o más cortos al azar. También cuando la acariciás, más seguido.

---

## Su rutina

Se configura en `config/cat.json`:

```json
{
  "name": "Nala",
  "scale": 2,
  "bowlAt": 0.12,
  "bedAt": 0.86,
  "meals":     ["08:30", "13:30", "20:00"],
  "playtimes": ["11:30", "18:30", "22:00"],
  "moments": [
    { "at": "07:45", "state": "stretch", "note": "" }
  ],
  "notes": []
}
```

- **`meals`** — a esa hora aparece el plato servido, ella camina hasta él y come.
  Comer le recarga la energía.
- **`playtimes`** — cae la pelota cerca de ella. Se agazapa, salta y la manotea.
- **`moments`** — momentos suyos: una pose forzada a cierta hora, con una nota
  opcional que aparece en un globito.
- **`notes`** — frases sueltas que aparecen cada tanto, sin horario fijo.
  Se muestran en orden aleatorio sin repetir hasta agotarlas.
- **`bowlAt`** — dónde va el plato, en fracción del ancho de **su** pantalla
  (0 a 1). Es del monitor donde está, no del escritorio entero: así no se corre
  de lugar cuando ella anda por varias pantallas.
- **`bedAt`** — lo mismo para su cama. Ahí se va a dormir cuando se lo pedís.
- **`bowlDisplay`** / **`bedDisplay`** — en qué monitor van, por índice
  (`0`, `1`, `2`…). Sin poner nada, van en el principal.
- **`scale`** — 2 la deja de ~96px de alto. Subilo si la querés más grande.

Ya instalada, este archivo se copia a la carpeta de datos de la app y se lee de
ahí, porque el que viene adentro del `.exe` es de solo lectura. **Abrir su
carpeta** en el menú de bandeja te lleva justo ahí.

Los estados que se pueden usar en `moments.state`: `idle`, `sit`, `sleep`,
`loaf`, `groom`, `stretch`, `walkTo`, `eat`, `play`, `alert`, `scratch`.

**`loaf`** es echada como un pan, con las patas metidas debajo: no está
durmiendo, está mirándote. No se levanta cuando pasás el cursor cerca — se
queda como está y te sigue con los ojos.

---

## Su casa

En el piso vive todo lo suyo. No es decorado: las cosas tienen medidas y ella
las usa.

| | |
|---|---|
| **Su rascadero** | Se para en dos patas y lo rasca. Arriba tiene una tablita donde se sienta. |
| **Su casa árbol** | Tres tablas a distinta altura: la baja, el techo de la casita y la de arriba. Sube salta a salta, cada una está al alcance desde la de abajo. |
| **Su cueva** | Se mete adentro a dormir. Se la ve asomando por la boca. |
| **Sus juguetes** | Un ratoncito, dos pelotitas y la varita con plumas, tirados por ahí. Cada tanto va y los manotea. |
| **Su cama** | La de siempre, redonda. |
| **Su plato** | El de siempre. |

Las tablas del árbol y del rascadero son **superficies de verdad**: se para
encima, camina por ellas y se cae si llega al borde, igual que con los bordes de
las ventanas. No están escritas en el código del motor: las declara el generador
de sprites al lado del dibujo y salen en `furniture.json`, así que mover una
tabla en el dibujo mueve también el lugar donde ella se para.

Se lo podés pedir desde el tray, desde el click derecho sobre ella, o con los
atajos. Y si no le decís nada, cada tanto va sola: rasca, se sube al árbol,
manotea un juguete, o si ya tiene sueño se mete en la cueva.

Dónde va cada cosa se configura en `config/cat.json`, en fracción del ancho de
**su** pantalla:

```json
{
  "postAt": 0.28,
  "treeAt": 0.55,
  "caveAt": 0.72,
  "bedAt":  0.86,
  "bowlAt": 0.12,
  "toys": [
    { "kind": "mouse",     "at": 0.20 },
    { "kind": "pelotita",  "at": 0.40 },
    { "kind": "pelotita2", "at": 0.45 },
    { "kind": "wand",      "at": 0.66 }
  ]
}
```

`kind` es el nombre del sprite en `furniture.json`. Cada cosa acepta además su
`*Display` (`postDisplay`, `treeDisplay`, `caveDisplay`, y `display` en los
juguetes) para mandarla a otro monitor por índice.

---

## Sus versiones

Hay más de una versión de su pinta. Se elige desde el tray, en **Su pinta**, o
con **Cambiarle la pinta** en el click derecho sobre ella. Se cambia en el acto:
la ventana se recarga y ella vuelve a aparecer con la nueva.

| | |
|---|---|
| **v1** | La primera. Gris neutro en la cabeza y la cola, cuerpo todo blanco, ojos verde oliva. |
| **v2** | Medida sobre las fotos de su Instagram. El gris es un taupe más tibio y marronoso, le baja del gorro por el lomo hasta la cola, la punta de la cola es más oscura, el gorro va en dos tonos partido por el blaze, y los ojos son oliva caqui con la pupila grande y delineado. |

La que viene puesta es la **v2**. La elegida queda guardada, así que sobrevive a
reiniciar la PC.

Cada versión vive en su propia carpeta, `assets/sprites/<id>/`, con su hoja de
sprites, sus objetos y su ícono de bandeja. La lista la escribe el generador en
`assets/sprites/looks.json`: la app la lee de ahí, no hay nada hardcodeado.

### Agregar una versión nueva

En `tools/make_sprites.py`, agregar una entrada a `LOOKS`:

```python
{
    "id": "v3",
    "label": "v3",
    "palette": {...},          # los nueve roles de color
    "marks": {"saddle": True}, # los rasgos que dibuja de más
}
```

`marks` es lo que hace que agregar una versión no toque a las anteriores: todos
los rasgos son opt-in, y las que no los tienen prendidos dibujan lo mismo que
antes. Los que hay hoy: `saddle` (el manto gris del lomo), `tabby` (el gorro en
dos tonos), `tailTip` (la punta de la cola oscura) y `eyeRing` (los ojos con
delineado y pupila grande).

Después:

```bash
python3 tools/make_sprites.py            # todas
python3 tools/make_sprites.py --look v3  # solo esa
```

y aparece sola en el menú.

---

## Lo que te dice

Cada tanto aparece un globito con algo suyo. Los mensajes están en
`src/renderer/engine/messages.js`, agrupados por momento:

| Grupo | Cuándo sale |
|---|---|
| `firstOfDay` | la primera vez en el día que la abrís |
| `morning` / `afternoon` / `night` / `lateNight` | según la hora |
| `waking` | cuando se despierta de una siesta |
| `afterMeal` | cuando termina de comer |
| `petted` | cuando la acariciás |
| `missYou` | cuando hace rato que no la tocás y te vino a buscar |
| `any` | las de siempre, sin motivo |
| `corazon` | las que pesan. Salen poco a propósito |

Cada grupo es una bolsa: se saca sin repetir hasta agotarla. `corazonChance`
(0.18 por defecto) es la probabilidad de que una de las del fondo se cuele en
lugar de una común.

**Las que vienen son un punto de partida.** Se pueden reemplazar enteras desde
`config/cat.json`, sin tocar código:

```json
"messages": {
  "any": ["lo que ella diría", "otra cosa suya"],
  "corazon": []
}
```

Un grupo definido en el config reemplaza al de fábrica completo, así que
poniendo `[]` se apaga. Las que van a significar algo son las tuyas, con cosas
que hacía de verdad.

---

## Sus necesidades

Tiene comida, agua, sueño, baño y cariño, y todas bajan solas con el tiempo. Se
ven pasando el mouse por encima de ella y esperando un momento: aparece un panel
con las cinco barras.

**Pero no es un tamagotchi.** Ella se las resuelve sola: cuando le baja el agua
va al bebedero, cuando le baja la comida va al comedero y **se sirve**, cuando le
sube el baño va al arenero, cuando le falta sueño se duerme. No hay que estar
atendiéndola — es independiente y ese es el punto.

Lo único que de verdad necesita es cuando llega al plato y no hay nada. Ahí se
sienta al lado y lo pide (`pideComida` / `pideAgua`). Si le sirven, lo agradece.
Pasa poco: `autoServe` está en `true`, así que tres de cada cuatro veces se
sirve sola.

| Necesidad | Tarda en vaciarse | Cómo la tapa |
|---|---|---|
| Comida | 7 h | va al comedero y se sirve |
| Agua | 5 h | va al bebedero |
| Sueño | según la hora | se duerme donde esté, o va a su cama o cueva |
| Baño | 9 h, y sube al comer | va al arenero, escarba y se lava |
| Cariño | 6 h | viene a buscarte. Se tapa acariciándola |

Se ajusta con `needHours` en el config. `autoServe: false` la vuelve más
dependiente: siempre va a pedir en vez de servirse.

---

## Su día

Los gatos son crepusculares: se encienden al amanecer y al atardecer, y duermen
entre 13 y 16 horas. Eso no está hecho con eventos sueltos sino con una curva de
actividad por hora, en `src/renderer/engine/routine.js`:

- **05:00–08:00** — se enciende. Ahí cae la primera hora loca.
- **09:00–17:00** — la siesta larga, con algún recreo cerca de la comida.
- **18:00–22:00** — su pico. Juega, ronda, se mete en todo.
- **22:00** — la segunda hora loca: sale disparada de una punta a la otra.
- **23:00–04:00** — la ronda de la noche y a la cama.

La curva empuja lo que tiende a hacer, no lo decide: a las tres de la tarde le
cuesta mucho más ponerse a jugar que a las ocho de la noche. Se puede pisar con
`routine.activityCurve` en el config (24 números de 0 a 1).

Además tiene **arenero**. Va sola cada tanto, y casi siempre después de comer —
como corresponde. Escarba, tapa, y sale a lamerse.

---

## Sus colores

El sprite se genera por código desde una paleta, así que cambiarle el pelaje es
cambiar unos colores. Los roles son `outline`, `base`, `light`, `shade`, `dark`,
`deep`, `pink`, `eye` y `pupil`.

Para regenerar los sprites después de tocar algo:

```bash
python3 tools/make_sprites.py
```

Para sacar la paleta de fotos automáticamente:

```bash
python3 tools/photo_palette.py fotos/*.jpg --preview
python3 tools/make_sprites.py
```

`--crop x1,y1,x2,y2` (fracciones 0..1) recorta la zona del pelaje si el fondo
ensucia el resultado. `--eye "#9aa85e"` fuerza el color de ojos.

### Convertir una foto en sprite

```bash
python3 tools/photo_to_sprite.py fotos/sentada.jpg --name sit
```

Saca el fondo, recorta, baja la resolución y reduce la paleta. Sale a
`assets/poses/<name>.png` con un preview ampliado al lado. Si la foto ya viene
recortada con transparencia, usá `--keep-alpha`. Si queda fondo pegado, subí
`--tol`.

---

## Caminar por las ventanas

Para subirse al borde superior de las ventanas, la app necesita saber dónde
están. Cada plataforma lo resuelve distinto.

### Windows

Funciona solo. Usa `node-window-manager`, que se instala con `npm install`.

### Linux con X11

```bash
sudo apt install wmctrl
```

### Linux con Wayland (GNOME)

Wayland no le cuenta a las apps dónde están las otras ventanas. La única forma
es una extensión de GNOME Shell, que está incluida y no hace más que publicar
esa geometría por D-Bus:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/deskcat@josbert.dev
cp gnome-extension/* ~/.local/share/gnome-shell/extensions/deskcat@josbert.dev/
gnome-extensions enable deskcat@josbert.dev
```

Después hay que reiniciar GNOME Shell: cerrar sesión y volver a entrar
(bajo Wayland `Alt+F2 r` no funciona).

Verificar que quedó andando:

```bash
gdbus call --session --dest org.gnome.Shell \
  --object-path /dev/josbert/DeskCat \
  --method dev.josbert.DeskCat.GetWindows
```

Sin esto la app arranca igual: Nala se queda viviendo en el piso.

---

## Notas de plataforma

- **Wayland**: la app se fuerza a XWayland (`--ozone-platform=x11`) porque
  Wayland no deja que una ventana se posicione sola en pantalla, y sin eso no
  hay gata que camine.
- **Sandbox de Chromium en Linux**: `npm start` corre con `--no-sandbox`. Para
  correrla con sandbox, `chrome-sandbox` tiene que ser de root:
  ```bash
  sudo chown root node_modules/electron/dist/chrome-sandbox
  sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
  npm run start:sandboxed
  ```
- **HiDPI**: si tenés escalado distinto de 100%, las coordenadas de las ventanas
  pueden quedar corridas respecto de las repisas.
- **Puntero en Linux**: `setIgnoreMouseEvents(ignore, {forward:true})` solo
  reenvía eventos de mouse en Windows y macOS. En Linux el proceso principal
  consulta `screen.getCursorScreenPoint()` a 60 Hz y le pasa la posición al
  renderer. Sin eso la ventana nunca se volvía sólida y los clicks se iban a
  las ventanas de atrás.
- **Depurar**: `NALA_DEBUG=1 npm start` loguea cuándo la ventana pasa a sólida,
  dónde está su zona sensible, y guarda una captura del canvas en
  `debug-shot.png` para poder ver qué está dibujando de verdad.
- **Multi-monitor**: la ventana cubre la unión de todas las pantallas, así que
  cruza de un monitor al otro caminando y cada tanto se manda sola de excursión
  a otro. El piso sale de la zona útil de cada monitor —camina **sobre** la
  barra de tareas, no por debajo— y los tramos contiguos que están a la misma
  altura se fusionan en uno solo. Si dos monitores quedan a distinta altura los
  tramos no se unen y ella se da vuelta en el borde en vez de caminar sobre el
  vacío. Desde el menú de bandeja, en **Por dónde anda**, se puede dejarla solo
  en la principal.
- **Escalado**: mezclar monitores con distinto escalado de Windows descoloca las
  posiciones, porque la ventana se mide en DIP y cada pantalla convierte con su
  propio factor. La app avisa por consola si detecta esa mezcla.

---

## Empaquetar

```bash
npm run dist:linux   # AppImage
npm run dist:win     # instalador NSIS + portable
```

---

## Cómo está armado

```
src/main/            proceso principal de Electron
  index.js           ventana transparente, click-through, tray
  windows/           geometría de ventanas, una estrategia por plataforma
src/renderer/
  main.js            loop, mouse, tooltips, globitos
  engine/
    sprites.js       spritesheet y animación
    world.js         el piso y los bordes de ventana como superficies
    cat.js           física, estados y personalidad
    props.js         el plato, la pelota, el premio y su cama
    furniture.js     su casa: rascadero, arbol, cueva y juguetes
    moments.js       horarios y notas
assets/sprites/
  looks.json         la lista de versiones, de aca la lee la app
  v1/ v2/            una carpeta por version: cat.png, props.png, tray.png
tools/
  make_sprites.py    genera los sprites de cada version desde su paleta
  photo_palette.py   saca la paleta de sus fotos
  photo_to_sprite.py convierte una foto en sprite pixel-art
gnome-extension/     geometría de ventanas bajo Wayland
config/cat.json      su nombre, sus horarios, sus notas
```

El sprite no es un PNG dibujado a mano: se dibuja por código en
`tools/make_sprites.py`, pose por pose, con mechones de pelo largo, la cola
plumosa y su gorro gris. Por eso cambiarle un color o una pose es tocar unas
líneas y volver a correr el script.
