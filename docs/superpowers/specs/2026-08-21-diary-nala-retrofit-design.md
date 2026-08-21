# Dev Diary — retoque de Nala para usar el server (sub-proyecto 2 de 2)

## Por qué

El [sub-proyecto 1](2026-08-21-diary-server-design.md) ya dejó funcionando un server
(`~/root/personal/nala-diary-server`) que guarda el diario en MySQL y lo sirve por
API. Esto retoca la app de Nala para que hable con esa API en vez de leer/escribir
`~/.config/Nala/diario.json` — así el diario queda igual en todas las máquinas
donde corra Nala, en vez de vivir separado en el disco de cada una.

## Config nueva

`config/servidor.json` (mismo patrón que `config/cat.json`/`config/proyectos.json`:
se copia a la carpeta de datos del usuario la primera vez, editable ahí):

```json
{ "apiUrl": "", "apiToken": "" }
```

Vacío por defecto. Hasta que Josbert lo complete con la URL real del server y el
token, el diario queda sin conectar (ver "Sin conexión" más abajo) — no rompe la
app, solo el panel del diario no tiene datos todavía.

## Qué se borra

`src/main/diary/store.js`, `stats.js` y `reports.js` (y sus tests en
`tests/diary/`) — toda esa lógica ahora vive en el server (sub-proyecto 1), copiada
verbatim de estos mismos archivos. Mantenerlos acá sin que nadie los llame sería
código muerto. `git-scan.js` y `scan-repos.js` **no se tocan** — siguen corriendo
`git log` en esta máquina, eso no cambia.

## Qué se agrega

`src/main/diary/api-client.js` — habla con la API vía el `fetch` global que ya
trae el proceso principal de Electron (Node 20). Expone:

- `bulkInsert(entries)` — `POST /api/entries/bulk`
- `addNote(note)` — `POST /api/entries`
- `fetchDiaryData()` — pide `GET /api/entries`, `/api/stats` y `/api/reports` en
  paralelo y devuelve `{entries, stats, reports}` — **la misma forma exacta** que
  `getDiaryData()` ya devolvía antes, así que `src/renderer/diary/diary.js` no
  necesita ningún cambio.

Todas las llamadas mandan `Authorization: Bearer <apiToken>`. Si `apiUrl` está
vacío, las funciones devuelven un error controlado (`{error: 'servidor no
configurado'}`) sin siquiera intentar la llamada de red.

## Qué cambia en `src/main/index.js`

- `runDiaryScan()` — sigue escaneando los repos de `proyectos.json` con
  `scanAllRepos` (igual que hoy), pero en vez de `diaryStore.saveDiary(...)`
  llama a `apiClient.bulkInsert(entries)`. El `lastHashes` (qué commits ya se
  vieron por repo, para no re-escanear todo cada vez) se seguía guardando junto
  con las entradas en `diario.json` — ahora se guarda solo, en un archivo chico
  aparte: `~/.config/Nala/scan-state.json`, `{ "lastHashes": {...} }`. Es una
  optimización de esta máquina nomás, no tiene sentido mandarla al server.
- `getDiaryData()` — pasa a ser `await apiClient.fetchDiaryData()` directamente,
  sin cálculo local.
- `addDiaryNote(note)` — pasa a ser `await apiClient.addNote(note)`.
- Si cualquiera de estas llamadas falla (servidor caído, sin red, sin
  configurar), se loguea con `console.error` (mismo estilo que el resto del
  archivo) y el error se propaga al renderer vía el `ipcMain.handle` — no se
  traga silenciosamente.

## Sin conexión

Si `window.diary.getData()` (desde `diary.js`) rechaza — porque
`apiClient.fetchDiaryData()` falló — el panel muestra un aviso arriba de todo:

> No se pudo conectar al server del diario.

y no actualiza las listas (se quedan como estaban, si había algo cargado de antes
en esta sesión). Esto también cierra un hueco que había quedado pendiente del
sub-proyecto anterior: hoy `addNote`/`loadAndRender` en `diary.js` no tenían
manejo de error — con este cambio, ambos casos (falla al cargar, falla al
guardar una nota) muestran el mismo aviso en vez de fallar en silencio.

## Fuera de alcance

- Reintentos automáticos con backoff — si falla, espera al próximo evento
  (reabrir el panel, o el siguiente scan cada 15 min) para reintentar. Sin
  lógica de reintento inmediato.
- Cachear el diario localmente para modo offline — ya se decidió en el
  sub-proyecto 1 que el server es la única fuente; no hay copia local de
  respaldo.
- Migrar datos ya existentes en `~/.config/Nala/diario.json` hacia el server —
  si Josbert quiere conservar ese historial, es un paso manual aparte
  (`POST /api/entries/bulk` con el contenido de ese archivo), no automatizado acá.
