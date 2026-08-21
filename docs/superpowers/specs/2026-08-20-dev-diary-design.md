# Dev Diary — panel de actividad de Nala

## Qué es

Un panel lateral, pegado al borde derecho de la pantalla, inspirado en mydev.cat: un
diario de la actividad de programación de Josbert (commits reales de sus repos +
notas manuales), más una pestaña de reportes simples sobre esa misma data.

Se abre/cierra con **click derecho sobre Nala** (ese gesto quedó libre al sacar el
panel de menú anterior).

## Arquitectura

- **Ventana nueva de Electron** (`BrowserWindow`), separada de la ventana transparente
  donde vive la gata. 320px de ancho, alto completo, pegada al borde derecho del
  monitor principal. Oculta por defecto (`show: false`), se togglea vía IPC.
  - Se mantiene separada de la ventana de la gata a propósito: esa ventana ya tiene
    lógica delicada de "atravesable / sólida" según dónde está el mouse (ver
    `src/main/index.js`, `startPointerPolling`), y meter un panel adentro la
    complicaría sin necesidad.
- El toggle se dispara así: `mousedown` con `e.button === 2` sobre la gata (en
  `src/renderer/main.js`) → `window.nala.toggleDiary()` (nuevo canal IPC) → el
  proceso principal muestra/oculta la `BrowserWindow` del diario.
- HTML/CSS/JS propio para el panel (sin framework), en
  `src/renderer/diary/index.html` + `diary.js` + `diary.css`.

## Datos

**`diario.json`** — en la carpeta de datos de la app (mismo lugar que
`settings.json`, vía `app.getPath('userData')`). Array de entradas:

```json
{
  "fecha": "2026-08-20",
  "hora": "17:02",
  "proyecto": "nala",
  "tipo": "git",
  "mensaje": "Look v4 con animaciones reales",
  "nota": null
}
```

- `tipo: "git"` — viene de un commit. `mensaje` es el primer renglón del commit.
- `tipo: "manual"` — lo escribiste vos desde un campo en la parte de arriba del
  panel (Diario). `proyecto` queda `null` para estas.

**`config/proyectos.json`** — array de rutas absolutas a carpetas que son repos git,
que vos mantenés a mano (mismo patrón que `config/cat.json`):

```json
{ "repos": [
  "/home/jos/root/bookforce/hildemaro/tecnomarket",
  "/home/jos/root/josbert-dev/erp-mobile",
  "/home/jos/root/personal/nala"
] }
```

## Cómo se juntan los commits

- Al abrir el panel (y cada 15 minutos en segundo plano mientras esté abierto), el
  proceso principal corre, por cada repo en `proyectos.json`:
  `git log --author=<tu nombre/email de git> --since=<último commit ya guardado>
  --pretty=format:...`
- El nombre/email para el filtro sale de `git config user.name` /
  `user.email` leído del repo (o el global si el repo no tiene uno propio) — así
  cada entrada nueva es autoría tuya, no de otra persona que haya tocado ese repo.
- Se guarda el hash del último commit visto por repo (en el mismo `diario.json`, o
  un `.ultimo-commit` chiquito por repo) para no reprocesar todo cada vez.
- Si una carpeta de `proyectos.json` no existe, no es un repo git, o `git log`
  falla: se saltea esa carpeta, se loguea el motivo en consola, y se sigue con las
  demás. Nunca rompe el panel entero por una carpeta mala.

## Entradas manuales

Un campo de texto arriba de la lista del Diario ("+ nota"). Al enviar, se agrega una
entrada `tipo: "manual"` con la fecha/hora actual.

## Vista: Diario

- Barra de stats: entradas totales, días activos, racha (días consecutivos —
  calendario, no 24hs — con al menos una entrada, sea git o manual).
- Heatmap de actividad (como el de mydev.cat), por día, últimas ~13 semanas.
- Lista cronológica de entradas, agrupadas por día, más recientes arriba. Cada
  tarjeta: hora, proyecto (si es git), mensaje/nota.
- **Sin métrica de tokens** — no hay forma de medirla sin conectar otra
  herramienta, así que se deja afuera por ahora.

## Vista: Reportes

Segunda pestaña arriba del panel. Todo derivado de las mismas entradas del Diario,
sin fuente de datos nueva:

1. **Resumen semanal en texto** — plantilla simple (no IA) tipo: "Esta semana: N
   commits en M proyectos. Racha de R días. Tu horario fuerte: <mañana/tarde/noche>."
2. **Commits por proyecto** — ranking en barras, últimos 7/30 días.
3. **Commits por día** — barras, últimos 7 días.
4. **Horarios más activos** — commits agrupados en mañana (6-12), tarde (12-20),
   noche (20-6), como barras de porcentaje.

## Estilo visual

Pixel art, paleta sacada directo de `assets/sprites/v4/cat.json` (outline
`#463a30`, base `#ece5d8`, dark `#8d8178`, pink `#dd9b88`). Bordes gruesos tipo
ventana retro, tipografía monoespaciada.

**Modo dark por defecto**, con un botón de toggle arriba del panel para pasar a
modo claro (mismos colores, invertidos — fondo claro con estos mismos acentos,
como ya se armó en el mockup).

## Fuera de alcance (v1)

- Proyectos / Achievements / Friends (secciones de mydev.cat que no se piden acá).
- Métrica de tokens de IA.
- Sincronización entre máquinas — todo es local a esta PC.
- Edición o borrado de entradas ya creadas.
