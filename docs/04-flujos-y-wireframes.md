# 04 — Flujos de usuario y wireframes

## 1. Login de alumnos — decisión de diseño

Se evaluaron las 4 opciones del brief. **Recomendación: combinarlas en un solo flujo por capas**, donde cada capa acelera a la siguiente:

| Mecanismo | Rol en el flujo |
|---|---|
| **Código de clase / QR** (Opción 3) | El docente proyecta un QR o un código corto (`SOL-42`). Escanear/tipearlo lleva directo a la grilla del curso. **Primera vez en un dispositivo.** |
| **Dispositivo recordado** | localStorage guarda institución+curso. Las tablets del aula quedan "fijadas" al curso → los alumnos abren la app y ya ven su grilla de nombres. **Cero pasos en usos siguientes.** |
| **Grilla de nombres con avatar** (Opciones 1/2) | El alumno toca su cara/nombre. Sin tipear. |
| **Clave simple** (Opciones 1/4) | Primaria baja: secuencia de **3 imágenes** (elige 3 de una grilla de 9 — memorable a los 6 años). Primaria alta/secundaria: **PIN de 4 dígitos**. Configurable por curso. |

Tiempo objetivo: **primera vez ~15 s, usos siguientes ~5 s** (2 taps + clave).

```
PRIMERA VEZ EN EL DISPOSITIVO          USOS SIGUIENTES
┌─────────────────────────┐            ┌─────────────────────────┐
│      🧠 MenteLab        │            │  1° A — Esc. San Martín │
│                         │            │  ¿Quién sos?            │
│  [📷 Escanear QR clase] │            │ ┌────┐ ┌────┐ ┌────┐    │
│                         │            │ │ 🦊 │ │ 🐼 │ │ 🦖 │    │
│  o escribí tu código:   │            │ │Juli│ │Mati│ │Sofi│    │
│  ┌───────────────┐      │            │ └────┘ └────┘ └────┘    │
│  │  SOL - 42     │      │            │ ┌────┐ ┌────┐ ┌────┐    │
│  └───────────────┘      │            │ │ 🐸 │ │ 🦄 │ │ 🐯 │    │
│                         │            │ │Fran│ │Emma│ │Leo │    │
│  ······················ │            │ └────┘ └────┘ └────┘    │
│  [🎮 Jugar sin cuenta]  │──ModoLibre │  [no soy de este curso] │
└─────────────────────────┘            └─────────────────────────┘
                                                  ↓ toca su nombre
                                       ┌─────────────────────────┐
                                       │  Hola Juli 🦊           │
                                       │  Tu clave secreta:      │
                                       │  ┌───┐ ┌───┐ ┌───┐      │
                                       │  │🍎 │ │⚽ │ │🚀 │ ...  │  (grilla 3×3
                                       │  └───┘ └───┘ └───┘      │   de imágenes,
                                       │  elegí tus 3 dibujos    │   o teclado PIN)
                                       └─────────────────────────┘
```

Fallbacks: docente puede resetear la clave en 2 clicks; "no soy de este curso" vuelve al código de clase.

## 2. Flujo de una partida (alumno)

```
HUB DE JUEGOS                       PRE-JUEGO (GameShell)
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Hola Juli 🦊   Nv 7 ▓▓▓░ 340xp│    │  ⚡ Tiempo de Reacción       │
│ 🔥 Racha: 4 días              │    │                              │
│                              │    │  Cuando la pantalla se ponga │
│ 📋 Misiones de hoy           │    │  VERDE, ¡tocá lo más rápido  │
│  ▸ Jugá 3 partidas    ▓▓░ 2/3│    │  que puedas!                 │
│  ▸ Batí tu récord 🎯     0/1 │    │                              │
│                              │    │  [▶ ver ejemplo]  (tutorial  │
│ ⚡Reacción 🧩Secuencia 🎯Aim  │    │        animado, 1ª vez auto) │
│ 🔢Números 📖Palabras 🐵Chimp │    │                              │
│ 👁️Visual  ⌨️Tipeo            │    │        [ ¡JUGAR! ]           │
│  (cards grandes, táctiles)   │    │   Tu récord: 312 ms 🏆       │
└──────────────────────────────┘    └──────────────────────────────┘

JUEGO                               RESULTADOS
┌──────────────────────────────┐    ┌──────────────────────────────┐
│                              │    │      ¡291 ms! 🎉             │
│                              │    │  ¡NUEVO RÉCORD PERSONAL!     │
│        (pantalla roja        │    │   (confetti + animación)     │
│         → verde, full        │    │                              │
│         screen, sin UI)      │    │  Ronda: 1  2  3  4  5        │
│                              │    │  ms:   310 295 291 305 299   │
│  ronda 3/5                   │    │  ▁▂▃▂▂  consistencia: alta   │
│                              │    │                              │
│                              │    │  +25 XP  🏅 "Rayo" nivel 2   │
│                              │    │  Misión: partidas ▓▓▓ 3/3 ✔  │
│                              │    │                              │
│                              │    │ [🔁 Otra vez] [🏠] [📊 Mi    │
│                              │    │               progreso]      │
└──────────────────────────────┘    └──────────────────────────────┘
```

Claves de UX:
- Durante el juego: **cero cromo** (sin header, sin distracciones). `GameShell` registra blur/pérdida de foco.
- Resultados: primero **lo positivo personal** (récord, mejora, XP), después el detalle, y solo al final —si la institución lo habilita— la posición en el ranking.
- Botón "Otra vez" prominente: maximiza partidas por sesión.

## 3. Perfil del alumno

```
┌────────────────────────────────────────────┐
│  🦊 Juli — Nivel 7  ▓▓▓▓▓▓░░ 340/500 XP    │
│  🔥 4 días seguidos · 87 partidas · 2h 15m │
├────────────────────────────────────────────┤
│  MI PERFIL COGNITIVO         (barras 0-100)│
│  ⚡ Velocidad de reacción  ▓▓▓▓▓▓▓░░░  68 ↑│
│  🧠 Memoria de trabajo     ▓▓▓▓▓░░░░░  52 ↑│
│  👀 Atención visual        ▓▓▓▓▓▓░░░░  61 =│
│  🎯 Precisión              ▓▓▓▓▓▓▓▓░░  77 ↑│
│  ⌨️ Velocidad de escritura ▓▓▓░░░░░░░  34 ↑│
│  📈 Consistencia           ▓▓▓▓▓▓░░░░  58  │
│  🚀 Capacidad de mejora    ▓▓▓▓▓▓▓░░░  71  │
│  🔥 Constancia             ▓▓▓▓▓▓▓▓▓░  90  │
├────────────────────────────────────────────┤
│  ⚡ Tiempo de Reacción                      │
│  Récord: 291ms 🏆 · Promedio 30d: 315ms    │
│  [gráfico de evolución con línea de        │
│   tendencia descendente = mejora]          │
│  "¡Mejoraste 8% este mes!" 🎉              │
├────────────────────────────────────────────┤
│  🏅 Mis insignias (12)  [ver todas]        │
│  🏆 Posición en mi curso: 4º de 28         │
│     (solo visible si la institución lo     │
│      habilita; siempre acompañada de       │
│      "subiste 2 puestos esta semana")      │
└────────────────────────────────────────────┘
```

## 4. Panel docente

```
┌─ MenteLab Docente ────────────────────────────────────────────┐
│ [Mis cursos ▾ 1°A]  [Benchmark ▾ Todos]  [Período ▾ 30 días]  │
├───────────────────────────────────────────────────────────────┤
│ RESUMEN 1° A            │  DISTRIBUCIÓN (reaction time)       │
│ 28 alumnos              │  [histograma + boxplot por curso,   │
│ 412 partidas este mes   │   línea = promedio del grado]       │
│ 89% jugó esta semana    │                                     │
│ Mejora media: +6.2%     │  EVOLUCIÓN                          │
│                         │  [líneas de tendencia por semana,   │
│ ⚠ 3 alumnos sin jugar   │   banda de percentiles 25-75]       │
│   hace 14+ días         │                                     │
├─────────────────────────┴─────────────────────────────────────┤
│ ALUMNOS                       [buscar] [+ Agregar] [⬆ CSV]    │
│ Nombre      Partidas  Mejor   Prom.  Tendencia  Última vez    │
│ Juli P.     32        291ms   315ms  ↗ +8%      hoy      [→]  │
│ Mati R.     28        340ms   371ms  ↗ +3%      ayer     [→]  │
│ Sofi G.     12        298ms   334ms  → 0%       hace 5d  [→]  │
│ ...                                                           │
│ [Exportar CSV] [Exportar Excel] [Comparar cursos]             │
└───────────────────────────────────────────────────────────────┘
```

Drill-down alumno → todos sus intentos → drill-down intento → timeline de eventos crudos (cada ronda/click), datos de dispositivo, foco perdido, etc.

### Flujo de carga de alumnos (CSV)

```
1. Descargar plantilla CSV (nombre, apellido, año_nacimiento, género?)
2. Subir archivo → preview con validación fila por fila
   (duplicados, edades fuera de rango marcados en amarillo/rojo)
3. Confirmar → alta en el curso seleccionado
4. Pantalla imprimible de credenciales: tarjetas con nombre + clave
   inicial (imágenes/PIN) para repartir, y QR del curso para proyectar
```

## 5. Modo Libre (invitado)

```
LANDING PÚBLICA
┌──────────────────────────────────────────┐
│  🧠 MenteLab                             │
│  Entrená tu mente jugando               │
│                                          │
│  [🎮 JUGAR AHORA]      [Soy docente →]   │
│  (sin registro)        [Tengo código de  │
│                         clase →]         │
└──────────────────────────────────────────┘
   ↓ primer juego: se crea deviceUuid + Player GUEST en el 1er "complete"
   ↓ el hub muestra su historial local (récords, partidas)
   ↓ banner opcional: "Elegí un alias para entrar al ranking mundial 🌍"
```

- El invitado juega **sin ningún paso previo** — el perfil guest se materializa recién cuando termina su primera partida.
- Sus datos van a las mismas tablas con `scope='GLOBAL'`, `institution_id=NULL` (doc 03 §5): estadística global posible, mezcla imposible.
- Ranking mundial solo con alias explícito (opt-in) — sin alias, juega y ve solo sus propias stats.

## 6. Flujo docente de sesión de clase

```
1. Docente en su panel: [▶ Iniciar sesión de clase] para 1°A
2. Se proyecta pantalla con QR gigante + código SOL-42
   (clave Redis classsession:SOL-42, TTL 12h)
3. Los alumnos escanean desde las tablets → grilla de su curso → clave → juegan
4. El panel del docente muestra actividad en vivo: quién entró,
   cuántas partidas van (polling cada 10 s sobre agregados)
```

## 7. Accesibilidad

- **Táctil**: targets mínimos 48×48 px; los juegos de click funcionan con tap; sin hover como única señal.
- **Daltonismo**: nunca color como único canal — el Reaction Time usa rojo→verde **y** cambio de forma/ícono (✋→👆) **y** texto ("¡AHORA!"); paleta verificada para deuteranopia/protanopia.
- **Lectores iniciales**: instrucciones con audio opcional (SpeechSynthesis), íconos grandes, frases cortas.
- **Teclado**: navegación completa por Tab en todo lo que no sea un juego de puntería; Typing/Number Memory 100 % teclado.
- **Tipografía**: base 18 px+ para alumnos, redondeada y legible (p.ej. Nunito); alto contraste WCAG AA.
- **Motion**: `prefers-reduced-motion` respetado (celebraciones sin flashes).
