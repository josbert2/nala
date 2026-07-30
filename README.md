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
llamarla, mandarla a su cama, hacerla dormir, esconderla o salir. Con más de un
monitor aparece además **Por dónde anda**, para dejarla en todas las pantallas
o solo en la principal.

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
`loaf`, `groom`, `stretch`, `walkTo`, `eat`, `play`, `alert`.

**`loaf`** es echada como un pan, con las patas metidas debajo: no está
durmiendo, está mirándote. No se levanta cuando pasás el cursor cerca — se
queda como está y te sigue con los ojos.

---

## Sus colores

El sprite se genera por código desde una paleta, así que cambiarle el pelaje es
cambiar seis colores. La paleta que viene está sacada de sus fotos: blanca de
pelo largo, gorro gris tabby en la cabeza, blaze blanco en la frente, nariz rosa,
ojos verde oliva.

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
    props.js         el plato, la pelota y el premio
    moments.js       horarios y notas
tools/
  make_sprites.py    genera los sprites desde la paleta
  photo_palette.py   saca la paleta de sus fotos
  photo_to_sprite.py convierte una foto en sprite pixel-art
gnome-extension/     geometría de ventanas bajo Wayland
config/cat.json      su nombre, sus horarios, sus notas
```

El sprite no es un PNG dibujado a mano: se dibuja por código en
`tools/make_sprites.py`, pose por pose, con mechones de pelo largo, la cola
plumosa y su gorro gris. Por eso cambiarle un color o una pose es tocar unas
líneas y volver a correr el script.
