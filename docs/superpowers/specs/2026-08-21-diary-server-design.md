# Dev Diary — server con MySQL (sub-proyecto 1 de 2)

## Por qué

El diario de Nala hoy guarda todo en un archivo local (`~/.config/Nala/diario.json`).
Josbert tiene varias máquinas y quiere ver el mismo diario en todas — necesita que
la data viva en un lugar central, no en el disco de una sola PC.

Esto se divide en dos sub-proyectos independientes:

1. **Este documento** — el server: docker-compose con MySQL + una API que guarda y
   sirve las entradas del diario. Autocontenido, se puede levantar y probar solo.
2. **Sub-proyecto 2 (a diseñar después)** — retocar Nala para que hable con esta
   API en vez de leer/escribir el archivo local. Depende de que el server ya
   exista y ande.

## Dónde vive

Repo nuevo y separado: `~/root/personal/nala-diary-server`, con su propio git —
no es una carpeta dentro del repo de Nala.

Corre en un VPS/servidor propio de Josbert, accesible desde cualquier máquina por
internet (no solo en red local). El deploy puntual a ese VPS queda fuera de este
documento — acá se construye el proyecto docker-compose listo para levantar en
cualquier servidor; dónde y cómo se despliega es decisión de Josbert al momento
de usarlo.

## Stack

- **Node.js + Express** — mismo lenguaje que ya usa toda la app de Nala, sin
  curva de aprendizaje nueva.
- **MySQL** vía el driver `mysql2`, **sin ORM**. El esquema es una sola tabla;
  un ORM (Prisma, Sequelize) agregaría peso sin beneficio real acá.
- **`node:test`** para los tests — mismo patrón que ya se usa en
  `nala/tests/diary/`.

## Esquema

Una sola tabla, mismos campos que ya usa el diario local (mismo shape que
`{hash, fecha, hora, proyecto, tipo, mensaje, nota}` en el `diario.json` actual):

```sql
CREATE TABLE entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(40) NULL UNIQUE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  proyecto VARCHAR(255) NULL,
  tipo ENUM('git','manual') NOT NULL,
  mensaje TEXT NOT NULL,
  nota TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

`hash` es único pero acepta múltiples `NULL` (MySQL permite varios `NULL` en una
columna `UNIQUE`) — así las notas manuales (`hash: null`) nunca chocan entre sí,
mientras que un commit con el mismo hash sí es rechazado si se intenta insertar
dos veces. Esto da el deduplicado gratis vía `INSERT IGNORE` al insertar en
bloque, sin necesitar lógica de dedup en la app.

La tabla se crea sola la primera vez que se levanta el contenedor de MySQL,
montando `migrations/001_create_entries.sql` en
`/docker-entrypoint-initdb.d/` (mecanismo propio de la imagen oficial de MySQL,
no hace falta un runner de migraciones a medida).

## Endpoints

Todos bajo `/api`, todos requieren el header `Authorization: Bearer <token>`
excepto `/api/health` — el token es un valor fijo generado una vez, guardado en
una variable de entorno del server (`API_TOKEN`) y en la config de la app de
Nala cuando llegue el sub-proyecto 2.

- `GET /api/entries` — todas las entradas, ordenadas por fecha+hora descendente.
- `POST /api/entries` — body `{mensaje, proyecto?}`. Crea una entrada
  `tipo: "manual"`, `hash: null`, `fecha`/`hora` = ahora (hora del server, UTC).
  Devuelve la entrada creada.
- `POST /api/entries/bulk` — body `{entries: [{hash, fecha, hora, proyecto,
  mensaje}]}`. Inserta en bloque vía `INSERT IGNORE` (los hashes ya vistos se
  ignoran silenciosamente, no rompen el request). Devuelve cuántas se
  insertaron de verdad.
- `GET /api/stats` — `{totalEntries, activeDays, streak, heatmap}`, calculado
  con la misma lógica de `computeStats`/`computeStreak`/`computeHeatmap` que ya
  existe y está probada en `nala/src/main/diary/stats.js` — se copia tal cual a
  `api/src/lib/stats.js` en este proyecto, sin reescribirla.
- `GET /api/reports` — `{weeklySummary, byProject, byDay, byHour}`, misma
  lógica de `nala/src/main/diary/reports.js`, copiada a `api/src/lib/reports.js`.
- `GET /api/health` — `{ok: true}`, sin auth, para el healthcheck de docker
  compose.

Errores devuelven JSON `{error: "mensaje"}` con el status HTTP correspondiente
(400 body inválido, 401 sin token o token incorrecto, 500 error de servidor).

## Estructura de archivos

```
nala-diary-server/
  docker-compose.yml        # servicios: api + mysql
  .env.example               # MYSQL_ROOT_PASSWORD, MYSQL_DATABASE, API_TOKEN, API_PORT
  api/
    Dockerfile
    package.json
    src/
      index.js               # arma la app de Express, registra rutas
      db.js                  # pool de conexiones mysql2
      middleware/auth.js     # valida el Bearer token
      routes/entries.js
      routes/stats.js
      routes/reports.js
      lib/stats.js           # copiada de nala/src/main/diary/stats.js
      lib/reports.js         # copiada de nala/src/main/diary/reports.js
  migrations/
    001_create_entries.sql
  tests/
    entries.test.js
    stats.test.js
    reports.test.js
    auth.test.js
```

## Testing

- `lib/stats.js` y `lib/reports.js` son funciones puras (idénticas a las ya
  probadas en el repo de Nala) — sus tests se portan prácticamente sin cambios.
- Las rutas (`entries`, `auth`) se prueban con integración real contra un MySQL
  de verdad: `docker compose up -d mysql` antes de correr `node --test`, igual
  de espíritu que como `tests/diary/scan-repos.test.js` en Nala usa repos git
  reales en vez de mockear `git`.

## Fuera de alcance

- Deploy al VPS en sí (aprovisionar el servidor, DNS, HTTPS/certificados) —
  eso lo hace Josbert cuando tenga el server listo para subir; este documento
  solo cubre que el proyecto quede armado y funcionando en local con
  `docker compose up`.
- Login de usuario/contraseña — un solo token fijo alcanza para un usuario único.
- El retoque de la app de Nala para consumir esta API — sub-proyecto 2, spec
  aparte, después de que este server esté funcionando.
- Migraciones incrementales / versionado de schema más allá del `.sql` inicial
  — con una sola tabla no hace falta un sistema de migraciones todavía.
