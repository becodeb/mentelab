# 05 — Gamificación, anti-frustración y perfil cognitivo

Principio rector: **se premia el proceso (jugar, volver, mejorar), no el talento**. Un alumno con malos resultados absolutos debe poder ganar tanto XP e insignias como el mejor del curso.

## 1. XP y niveles

Toda partida completada da XP. El XP **nunca depende del resultado absoluto comparado con otros** — solo de jugar, del esfuerzo y de la mejora contra uno mismo:

| Fuente | XP | Nota |
|---|---|---|
| Partida completada | 10 | base fija, siempre |
| Primera partida del día | +10 | incentiva volver cada día |
| Benchmark distinto al anterior | +5 | incentiva variedad (mejor dato cognitivo) |
| Superar el promedio propio de 30 días | +10 | mejora contra sí mismo |
| Récord personal | +25 | el evento estrella |
| Misión diaria completada | +20–40 | según misión |
| Racha: día 3 / 7 / 14 / 30 | +15/+30/+60/+120 | bonus escalonado |
| Insignia obtenida | +según insignia | |

- **Niveles**: curva suave `XP(nivel n→n+1) = 100 + 40·(n−1)` — subir de nivel es frecuente al principio (enganche) y sigue siendo alcanzable después. Sin límite de nivel.
- Todo pasa por el **ledger `xp_transactions`** (append-only): auditable, re-computable, y permite mostrar "cómo gané mi XP".
- Anti-farming: XP de "partida completada" con rendimiento decreciente después de N partidas del mismo benchmark en el día (partida 1–5: 100 %, 6–10: 50 %, 11+: 10 %). Los datos igual se guardan todos.

## 2. Insignias (badges)

Catálogo **en código** (`packages/benchmarks` + módulo gamification), evaluadas en la transacción post-intento. Cuatro familias, deliberadamente sesgadas hacia esfuerzo/constancia/mejora:

| Familia | Ejemplos |
|---|---|
| **Constancia** 🔥 | "3 días seguidos", "una semana entera", "un mes", "jugaste 4 lunes seguidos", "volviste después de 2 semanas — ¡te extrañábamos!" |
| **Esfuerzo** 💪 | "10/50/100/500 partidas", "probaste los 8 juegos", "10 partidas en un día", "1 hora total de entrenamiento" |
| **Mejora** 📈 | "primer récord personal", "3 récords en una semana", "mejoraste tu promedio 3 semanas seguidas", "+20 % en un mes" |
| **Maestría** 🏆 (la única por resultado) | por hitos absolutos por benchmark ("nivel 10 en Sequence"), con **niveles bronce/plata/oro** para que haya un escalón alcanzable para todos |

Cada insignia: código estable, nombre, ícono, descripción, condición (función pura sobre el contexto del intento + agregados). Agregar una insignia = agregar una entrada al catálogo.

## 3. Misiones diarias y rachas

- **3 misiones por día por jugador**, generadas determinísticamente (seed = playerId+fecha) de un pool balanceado: 1 de volumen ("jugá 3 partidas"), 1 de variedad ("jugá 2 juegos distintos"), 1 personal ("acercate a 20 ms de tu récord", calibrada con sus agregados — **siempre alcanzable**).
- **Racha** = días calendario consecutivos con ≥1 partida completada. Con **protector de racha**: 1 día de gracia por semana se "repara" automáticamente (evita la frustración del fin de semana — psicológicamente crítico en Duolingo y similares).
- La racha se muestra siempre en el hub (🔥 N días) — es el gancho de retorno más fuerte.

## 4. Perfil cognitivo (el diferencial)

> Comunicación obligatoria en UI docente: *"Indicadores lúdico-educativos. No constituyen evaluación psicométrica ni diagnóstico."*

### Indicadores y matriz de contribución

Cada benchmark declara sus `contributions` (doc 02 §3). Matriz inicial (ajustable sin migración, vive en código):

| Indicador | Se alimenta de |
|---|---|
| ⚡ Velocidad de reacción | Reaction Time (0.7), Aim Trainer (0.3) |
| 🧠 Memoria de trabajo | Number Memory (0.35), Sequence (0.3), Chimp (0.35) |
| 👀 Atención visual | Visual Memory (0.4), Chimp (0.3), Aim (0.3) |
| 🎯 Precisión | Aim (0.4), Typing precisión (0.3), Visual (0.3) |
| ⌨️ Velocidad de escritura | Typing (1.0) |
| 📈 Consistencia | desvío relativo intra-benchmark, promedio entre todos los jugados |
| 🚀 Capacidad de mejora | pendiente de mejora 30d normalizada, promedio entre benchmarks |
| 🔥 Constancia | frecuencia de juego: días activos/30, racha, regularidad |

### Cálculo

1. Por benchmark: `score_normalized` = percentil del score dentro de la **banda etaria** (edad ±1) sobre una ventana rolling de la población global anónima → 0–100. Mientras no haya masa crítica de datos, fallback a curvas de referencia fijas por edad definidas por benchmark (calibradas con datos públicos de Human Benchmark ajustados por edad, marcadas como "beta").
2. Por indicador: promedio ponderado de los `score_normalized` recientes (ventana 30 días, decaimiento exponencial — pesa más lo último) según la matriz.
3. Persistencia semanal en `cognitive_scores` → el perfil tiene **serie temporal**: el alumno ve sus barras crecer; el docente ve la evolución del curso por indicador.
4. Recalculo: on-write incremental para el indicador afectado + job semanal de consolidación.

Los indicadores 📈🚀🔥 no dependen de qué tan "bueno" es el alumno — **cualquier chico puede tener 90+ en Constancia**. Esto garantiza que el perfil siempre tenga barras altas que mostrar con orgullo.

## 5. Anti-frustración (UX + psicología)

Mecanismos concretos, no decorativos:

1. **El marco por defecto es "vos vs vos"**: la pantalla de resultados compara con el propio promedio y récord. El ranking es una pestaña aparte, y por defecto **los alumnos ven solo el top 3 + su vecindario** (dos arriba, dos abajo) — nunca una lista completa donde el último se vea último. Configurable por institución.
2. **Nunca "perdiste" ni rojo de error como cierre**: el fin de partida siempre destaca algo positivo real (mejor ronda, mejora vs ayer, XP). El catálogo de mensajes es curado: *"¡Tu mejor ronda fue de 280 ms — más rápida que tu récord de la semana pasada!"*.
3. **Metas próximas, no lejanas**: "estás a 12 ms de tu récord" en vez de "estás a 200 ms del primero".
4. **Dificultad adaptable** (`defaultConfigFor` + historial): los juegos por niveles arrancan cerca del nivel logrado antes, para que el tiempo de juego se pase en la zona desafiante y no repitiendo lo trivial (flow).
5. **Celebrar el regreso, no castigar la ausencia**: quien vuelve tras semanas recibe insignia + misión fácil de re-enganche. La racha rota nunca se muestra como pérdida ("¡empezá una nueva racha hoy!").
6. **Percentiles jamás visibles para alumnos** — son insumo del perfil cognitivo y del panel docente.
7. **Refuerzo variable**: micro-celebraciones aleatorias ocasionales por partidas normales (confetti sorpresa) — el refuerzo intermitente sostiene el hábito.
8. Colores cálidos y amigables; los errores en juego se marcan con sacudida suave + sonido neutro, nunca con rojo estridente ni buzzer.

## 6. Implementación

Módulo `gamification` procesa cada intento completado en una única transacción (`processAttemptRewards`):

```
attempt COMPLETED
  → actualizar PlayerProgress (racha, contadores)
  → evaluar récord personal (PersonalBest)
  → asignar XP (ledger) + nivel
  → avanzar PlayerMissions del día
  → evaluar catálogo de insignias (funciones puras con contexto precargado)
  → devolver RewardsSummary al cliente (para la pantalla de resultados)
```

Todo el catálogo (misiones, insignias, mensajes, curva XP) vive en código versionado con tests unitarios — cambiar el balance del juego es un PR, no una migración.
