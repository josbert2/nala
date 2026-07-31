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

### Que arranque sola con la sesión

```bash
./tools/autostart.sh
```

Deja un `nala.desktop` en `~/.config/autostart/`. Arranca con 10 segundos de
retraso: si arranca junto con la sesión todavía no hay escritorio donde ponerse
y la ventana puede quedar mal ubicada.

Para sacarla: `rm ~/.config/autostart/nala.desktop`.

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

## Lo que recuerda

Guarda en `~/.config/Nala/estado.json`:

- **Cómo estaba** — sus necesidades y su energía. Al abrirla vuelve donde
  quedó, y se le corre el tiempo que la app estuvo cerrada. Ese tiempo se
  **topea en 4 horas**: si estuvo apagada tres días no tiene sentido que vuelva
  muerta de hambre, se sirve sola, ya hubiera comido.
- **Si ya te saludó hoy** — así el saludo del día es de verdad uno por día.
- **Desde cuándo están juntos** — se graba solo la primera vez que corre.

Los días juntos salen en el globo del ícono de bandeja, y cualquier mensaje
puede usar `{dias}`:

```json
"messages": { "firstOfDay": ["Van {dias} días así."] }
```

Para cambiar la fecha de inicio, editá `desde` en `estado.json`. Si querés que
cuente desde el día que llegó a tu casa y no desde que instalaste la app, es
ahí.

---

## Trabajás vos, duerme ella

Lo que estás haciendo vos **inclina** lo que ella elige hacer, pero no lo decide:
su ritmo de gato — la curva del día — sigue mandando. Si lo decidiera, dejaría
de ser un gato y pasaría a ser un indicador de tu teclado.

- **Mientras venís usando la compu** se queda tranquila cerca: pose de pan,
  dormir, lamerse. Casi no sale de excursión, no se va a otro monitor y da menos
  vueltas.
- **Cuando dejás el teclado un rato** se enciende: camina más, se estira, se mete
  en sus cosas.

Va así por tres razones. Es lo que hacen de verdad — un gato duerme al lado tuyo
mientras trabajás y se activa cuando parás. Es lo único que le permite quedarse
abierta todo el día sin volverse molesta. Y, la que menos se ve venir: si sólo se
activara cuando no estás, **nunca la verías hacer nada**. Lo mejor que tiene —
la pose de pan, los prrr, los sueños, el bostezo — pasaría siempre con vos
mirando para otro lado.

---

## Que se venga a acompañar

Si venís moviendo el mouse un rato largo — o sea, si estás trabajando — cada
tanto se viene, se echa al lado de donde tenés el cursor y se queda. No pide
nada: está. *"Seguí, yo me quedo acá."*

La actividad se mide con un promedio móvil de si moviste el mouse hace menos de
un segundo. Es lo más cerca de "está trabajando" que se puede estar sin espiarte
el teclado, y no requiere ningún permiso.

Con un descanso de 8 minutos entre una vez y la siguiente, para que sea algo que
pasa y no algo que hace todo el tiempo.

---

## El regalito

Los gatos le llevan lo que cazan a quien quieren. Ella no caza nada de verdad,
así que agarra uno de sus juguetes, **te lo lleva hasta donde tenés el cursor**,
lo deja ahí y se queda esperando que lo veas — *"Es para vos."*

Se le ocurre sola **cada 12 a 20 minutos** como mucho — antes entraba en la
ruleta cada 30 segundos y andaba con el juguete en la boca todo el tiempo, que
no es lo que hace un gato.

Y cuando se va a la cama, cada tanto **se lleva un juguete y se duerme con él al
lado**. El juguete tirado no se evapora: mientras ella esté cerca se queda ahí
todo lo que haga falta, y recién se guarda cuando ella ya no está hace rato.

---

## Que reaccione a tu pantalla

Cuando abrís una ventana grande, **se sobresalta**: lomo arqueado, cola inflada,
orejas para atrás, y después se queda mirando hacia donde apareció.

Es lo único que la hace reaccionar a *tu* mundo y no al suyo — todo lo demás
pasa en el de ella. Por eso va con la mano liviana: sólo ventanas de más de
260.000 px², sólo si estaba tranquila, y una vez cada minuto y medio como mucho.
Si te sobresaltara con cada pestaña la ibas a querer apagar en un día.

Se cuelga de la lista de ventanas que ya publica la extensión de GNOME y que la
app consulta cada 700 ms para las repisas: compara contra el tick anterior y ve
cuál es nueva. **Sin la extensión instalada esto no pasa nunca.**

---

## Los pajaritos

Cada tanto pasa uno, en cualquier hábitat. No cruza de largo: **se posa** en una
tabla de sus muebles o en el piso, y ahí vive — pega saltitos, picotea, se da
vuelta a mirar, cambia de percha y se va.

Entran de a uno a tres, del mismo lado y escalonados. Y **se espantan juntos**:
si uno levanta vuelo, los que están cerca salen atrás. Eso es lo que los hace
parecer una bandada y no tres pájaros sueltos que casualmente están en el mismo
lugar.

Ella se ocupa del que tenga más cerca, y no lo persigue de entrada: **se sienta a mirarlo y castañetea**. Ese
`ek ek ek` que hacen los gatos cuando ven un pájaro que no pueden alcanzar. Sale
con las mismas partículas que los prrr.

Y si el pájaro sigue posado, se decide y lo **acecha**: agazapada y muy despacio.
Ahí está el juego, y está en una sola línea de `Bird.update()`:

```js
const limite = Math.abs(catVel) > 55 ? 165 : 74
```

Si va a la carrera el pájaro levanta vuelo de lejos. Si va agazapada y lenta lo
deja acercarse mucho más. Nunca lo agarra — pero casi.

`Ctrl+Alt+J` hace pasar uno.

---

## Sus hábitats

Hay cuatro decorados y se cambia desde el menú → **Su hábitat**. Se definen en
`config/habitats.json`, sin tocar código.

| | Qué tiene |
|---|---|
| `casa` | rascadero, caja, casa árbol, cueva, cama, juguetes |
| `jardin` | piso de pasto, arbustos, flores, árbol de verdad, regadera, caja |
| `parque` | caja, tobogán, túnel, cuerda, pelotero |
| `ventana` | ventana con cielo, cortinas, repisa, macetas, cama, caja |

Su plato, su bebedero y su arenero **no** están en el hábitat: van siempre,
porque los necesita. Esos se posicionan desde `config/cat.json`.

### Cómo se agrega una pieza

Una pieza es sólo un sprite con nombre. El motor saca todo de la hoja:

- Si existen `<kind>_back` y `<kind>_front`, se dibuja en dos partes y ella se
  puede meter adentro — el frente se dibuja por encima de ella **sólo** cuando
  está adentro; si fuera siempre la taparía al pasar caminando. Así funcionan la
  cueva, el túnel, el arenero, la cama y la caja.
- Si el sprite declara `ledges` en su json, esas tablas se vuelven superficies
  de verdad y ella se sube.
- `floor` en el hábitat repite una pieza a lo ancho de toda la pantalla. Así
  está hecho el pasto del jardín.

Entonces: la dibujás en `tools/make_sprites.py`, la nombrás en `FURNITURE` y la
ponés en un hábitat. El motor no se toca.

### Qué papel cumple cada pieza

`PIECE_ROLE` en `src/renderer/main.js` mapea cada pieza a una conducta suya. En
el jardín el árbol de verdad es "su árbol", en el parque el túnel es "su cueva",
en la ventana la repisa es algo a lo que subirse. Así las conductas que ya
existen sirven en todos los hábitats sin escribirlas de nuevo.

**La caja tiene la suya propia**: no se sube arriba, se mete adentro y se queda
ahí mirando, con la cabeza asomando por encima del cartón. No duerme — mira. Por
eso su pared de adelante es baja a propósito, y por eso pesa doble en la ruleta
de `_decide`: es una caja.

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

## Lo que recuerda

Guarda en `~/.config/Nala/estado.json`:

- **Cómo estaba** — sus necesidades y su energía. Al abrirla vuelve donde
  quedó, y se le corre el tiempo que la app estuvo cerrada. Ese tiempo se
  **topea en 4 horas**: si estuvo apagada tres días no tiene sentido que vuelva
  muerta de hambre, se sirve sola, ya hubiera comido.
- **Si ya te saludó hoy** — así el saludo del día es de verdad uno por día.
- **Desde cuándo están juntos** — se graba solo la primera vez que corre.

Los días juntos salen en el globo del ícono de bandeja, y cualquier mensaje
puede usar `{dias}`:

```json
"messages": { "firstOfDay": ["Van {dias} días así."] }
```

Para cambiar la fecha de inicio, editá `desde` en `estado.json`. Si querés que
cuente desde el día que llegó a tu casa y no desde que instalaste la app, es
ahí.

---

## Trabajás vos, duerme ella

Lo que estás haciendo vos **inclina** lo que ella elige hacer, pero no lo decide:
su ritmo de gato — la curva del día — sigue mandando. Si lo decidiera, dejaría
de ser un gato y pasaría a ser un indicador de tu teclado.

- **Mientras venís usando la compu** se queda tranquila cerca: pose de pan,
  dormir, lamerse. Casi no sale de excursión, no se va a otro monitor y da menos
  vueltas.
- **Cuando dejás el teclado un rato** se enciende: camina más, se estira, se mete
  en sus cosas.

Va así por tres razones. Es lo que hacen de verdad — un gato duerme al lado tuyo
mientras trabajás y se activa cuando parás. Es lo único que le permite quedarse
abierta todo el día sin volverse molesta. Y, la que menos se ve venir: si sólo se
activara cuando no estás, **nunca la verías hacer nada**. Lo mejor que tiene —
la pose de pan, los prrr, los sueños, el bostezo — pasaría siempre con vos
mirando para otro lado.

---

## Que se venga a acompañar

Si venís moviendo el mouse un rato largo — o sea, si estás trabajando — cada
tanto se viene, se echa al lado de donde tenés el cursor y se queda. No pide
nada: está. *"Seguí, yo me quedo acá."*

La actividad se mide con un promedio móvil de si moviste el mouse hace menos de
un segundo. Es lo más cerca de "está trabajando" que se puede estar sin espiarte
el teclado, y no requiere ningún permiso.

Con un descanso de 8 minutos entre una vez y la siguiente, para que sea algo que
pasa y no algo que hace todo el tiempo.

---

## El regalito

Los gatos le llevan lo que cazan a quien quieren. Ella no caza nada de verdad,
así que agarra uno de sus juguetes, **te lo lleva hasta donde tenés el cursor**,
lo deja ahí y se queda esperando que lo veas — *"Es para vos."*

Se le ocurre sola **cada 12 a 20 minutos** como mucho — antes entraba en la
ruleta cada 30 segundos y andaba con el juguete en la boca todo el tiempo, que
no es lo que hace un gato.

Y cuando se va a la cama, cada tanto **se lleva un juguete y se duerme con él al
lado**. El juguete tirado no se evapora: mientras ella esté cerca se queda ahí
todo lo que haga falta, y recién se guarda cuando ella ya no está hace rato.

---

## Que reaccione a tu pantalla

Cuando abrís una ventana grande, **se sobresalta**: lomo arqueado, cola inflada,
orejas para atrás, y después se queda mirando hacia donde apareció.

Es lo único que la hace reaccionar a *tu* mundo y no al suyo — todo lo demás
pasa en el de ella. Por eso va con la mano liviana: sólo ventanas de más de
260.000 px², sólo si estaba tranquila, y una vez cada minuto y medio como mucho.
Si te sobresaltara con cada pestaña la ibas a querer apagar en un día.

Se cuelga de la lista de ventanas que ya publica la extensión de GNOME y que la
app consulta cada 700 ms para las repisas: compara contra el tick anterior y ve
cuál es nueva. **Sin la extensión instalada esto no pasa nunca.**

---

## Los pajaritos

Cada tanto pasa uno, en cualquier hábitat. No cruza de largo: **se posa** en una
tabla de sus muebles o en el piso, y ahí vive — pega saltitos, picotea, se da
vuelta a mirar, cambia de percha y se va.

Entran de a uno a tres, del mismo lado y escalonados. Y **se espantan juntos**:
si uno levanta vuelo, los que están cerca salen atrás. Eso es lo que los hace
parecer una bandada y no tres pájaros sueltos que casualmente están en el mismo
lugar.

Ella se ocupa del que tenga más cerca, y no lo persigue de entrada: **se sienta a mirarlo y castañetea**. Ese
`ek ek ek` que hacen los gatos cuando ven un pájaro que no pueden alcanzar. Sale
con las mismas partículas que los prrr.

Y si el pájaro sigue posado, se decide y lo **acecha**: agazapada y muy despacio.
Ahí está el juego, y está en una sola línea de `Bird.update()`:

```js
const limite = Math.abs(catVel) > 55 ? 165 : 74
```

Si va a la carrera el pájaro levanta vuelo de lejos. Si va agazapada y lenta lo
deja acercarse mucho más. Nunca lo agarra — pero casi.

`Ctrl+Alt+J` hace pasar uno.

---

## Sus hábitats

Hay cuatro decorados y se cambia desde el menú → **Su hábitat**. Se definen en
`config/habitats.json`, sin tocar código.

| | Qué tiene |
|---|---|
| `casa` | rascadero, caja, casa árbol, cueva, cama, juguetes |
| `jardin` | piso de pasto, arbustos, flores, árbol de verdad, regadera, caja |
| `parque` | caja, tobogán, túnel, cuerda, pelotero |
| `ventana` | ventana con cielo, cortinas, repisa, macetas, cama, caja |

Su plato, su bebedero y su arenero **no** están en el hábitat: van siempre,
porque los necesita. Esos se posicionan desde `config/cat.json`.

### Cómo se agrega una pieza

Una pieza es sólo un sprite con nombre. El motor saca todo de la hoja:

- Si existen `<kind>_back` y `<kind>_front`, se dibuja en dos partes y ella se
  puede meter adentro — el frente se dibuja por encima de ella **sólo** cuando
  está adentro; si fuera siempre la taparía al pasar caminando. Así funcionan la
  cueva, el túnel, el arenero, la cama y la caja.
- Si el sprite declara `ledges` en su json, esas tablas se vuelven superficies
  de verdad y ella se sube.
- `floor` en el hábitat repite una pieza a lo ancho de toda la pantalla. Así
  está hecho el pasto del jardín.

Entonces: la dibujás en `tools/make_sprites.py`, la nombrás en `FURNITURE` y la
ponés en un hábitat. El motor no se toca.

### Qué papel cumple cada pieza

`PIECE_ROLE` en `src/renderer/main.js` mapea cada pieza a una conducta suya. En
el jardín el árbol de verdad es "su árbol", en el parque el túnel es "su cueva",
en la ventana la repisa es algo a lo que subirse. Así las conductas que ya
existen sirven en todos los hábitats sin escribirlas de nuevo.

**La caja tiene la suya propia**: no se sube arriba, se mete adentro y se queda
ahí mirando, con la cabeza asomando por encima del cartón. No duerme — mira. Por
eso su pared de adelante es baja a propósito, y por eso pesa doble en la ruleta
de `_decide`: es una caja.

---

## Sus versiones

Hay tres pintas y se cambia desde el menú → **Cambiarle la pinta**. Cada una
tiene su propia carpeta en `assets/sprites/<id>/`, y se definen en `LOOKS` en
`tools/make_sprites.py`.

| | Su cara | Ojos |
|---|---|---|
| `v1` | gorro gris cruzado, gris neutro | grandes, sin delineado |
| `v2` | gorro gris cruzado, paleta tibia | grandes, con delineado |
| `v3` | **parche de un solo lado** | más chicos y juntos |

`v3` es la que está corregida contra sus fotos y es la que viene por defecto.
`v2` quedó **intacta**, pixel por pixel, por si esa gusta más.

Lo que distingue una versión de otra son dos cosas, las dos opt-in para que
agregar una no toque a las anteriores:

- **`marks`** — rasgos que se dibujan de más: `tabby` (el gorro en dos tonos),
  `eyeRing` (iris con delineado), `sideCap` (el parche de un lado en vez del
  gorro cruzado).
- **`eyes`** — cuál de los `EYE_SETS` usa: `normal` o `small`.

### El parche de un lado (v3)

Le cubre **su** izquierda, que mirándola de frente cae del lado derecho, y le
queda **por encima** del ojo, no tapándolo. Esa oreja es gris; la otra es blanca
con un tono apenas más oscuro para que no desaparezca sobre la cabeza blanca
(el contorno de 1px sólo agarra bordes contra transparente, no contra otro
relleno). El blaze arranca entre los ojos y se abre hacia el lado blanco.

Es un `pieslice` de 250° a 350° — en Pillow 0° es la derecha, 180° la izquierda,
270° arriba — con unos mechones sueltos desflecándole el borde.

**Cuando camina hacia el otro lado el parche cambia de lado**, porque el sprite
se espeja. Eso es correcto: si ella se da vuelta, la marca que tenía a un lado
pasa a verse del otro.

### Los ojos

`EYE_SETS` tiene dos juegos de medidas, y cada uno lleva dos: con qué radios los
dibuja el generador y con qué radios los repinta el motor. Son números distintos
a propósito — Pillow rasteriza más gordo que `2*r` y hay que compensarlo, o la
mirada le queda distinta a la del sprite.

---

## Cómo mira

Dos cosas que hacen que se lea como un gato y no como un muñeco:

**La cabeza va clavada en el aire.** Los gatos estabilizan la cabeza: fijan la
mirada en algo y la cabeza queda quieta mientras el cuerpo se mueve debajo. En
las poses de caminar, correr, comer y escarbar el `bob` del cuerpo NO se le
aplica a la cabeza — el cuerpo rebota y la cabeza no. Es un cambio de una línea
por pose en `tools/make_sprites.py` y es lo que más la cambió.

**Los ojos siguen las cosas.** La pupila no está pintada en el sprite: el
generador anota dónde quedó cada ojo en cada frame (`animations.<pose>.eyes`) y
con qué radios pintarlo (`eye` en el json), y el motor repinta el ojo encima con
la pupila corrida. Así mira el cursor, la pelota o el premio sin necesidad de
pre-renderizar una versión del sprite por cada dirección.

El ojo se rasteriza en la grilla del sprite (`SpriteSheet._blob`), no con
`ctx.ellipse`: una elipse suavizada al lado del pixel art canta muchísimo. Los
radios de `EYE_GEOM` están medidos sobre los píxeles que realmente salen del
sprite, no sobre los que se le pasan a Pillow — Pillow rasteriza más gordo que
`2*r` y si no se compensa, la mirada le queda distinta.

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
