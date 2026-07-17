# 06 — Sistema de rankings

## 1. Dimensiones

Un ranking queda definido por 4 ejes ortogonales:

| Eje | Valores |
|---|---|
| **Alcance (scope)** | curso · grado · edad · institución · **global (Modo Libre)** |
| **Benchmark** | cada slug del registry (+ "general" = XP/nivel) |
| **Período** | hoy · última semana · últimos 30 días · año escolar · histórico |
| **Métrica de orden** | mejor marca · promedio · consistencia · cantidad de partidas · progreso |

**Separación institucional/global es estructural**: el scope global solo consulta `attempts.scope='GLOBAL'`; los institucionales filtran por `institution_id`. No existe ningún ranking que combine ambos — la clave Redis misma codifica el scope, y la API valida que un actor institucional no pueda pedir scope global mezclado ni viceversa.

## 2. Definición de métricas de orden

| Métrica | Cálculo | Para qué sirve |
|---|---|---|
| Mejor marca | `MAX(score)` (o MIN si `lower_better`) en el período | el clásico |
| Promedio | media de scores del período (mín. 3 intentos para rankear) | premia rendimiento sostenido |
| Consistencia | `1 − (desvío estándar / media)` del período, mín. 5 intentos | premia regularidad — cualquier nivel puede ganarla |
| Partidas | `COUNT(*)` del período | premia esfuerzo puro |
| Progreso | pendiente de regresión lineal de score vs tiempo, normalizada como % de mejora | **premia al que más mejoró — el ranking donde el último puede salir primero** |

Las métricas de esfuerzo/progreso/consistencia son deliberadamente de primera clase: cada semana el docente puede proyectar "el podio de los que más mejoraron" con el mismo sistema.

## 3. Implementación

### Redis (lecturas calientes)

- Clave: `lb:{scopeType}:{scopeId}:{benchmark}:{period}:{metric}` → ZSET (member=playerId, score=valor).
- **Update on-write**: al completar un intento se actualizan solo las claves de "mejor marca" y "partidas" de los scopes del jugador (curso, grado, edad, institución — 4×4 períodos ≈ 32 ZADD/ZINCRBY, sub-ms cada uno).
- **Promedio, consistencia y progreso** requieren agregación → job cada 15 min recalcula desde `player_benchmark_stats`/SQL solo para jugadores con actividad reciente (set `dirty:players`).
- Períodos rolling ("últimos 30 días") se materializan por job diario; "hoy"/"semana" usan claves por fecha (`:d:2026-07-16`) con TTL — no hay que restar nada.
- Redis caído o vacío → fallback transparente a SQL (las mismas queries que arman los ZSET) con caché corto.

### SQL (fuente de verdad + históricos)

- Queries sobre `attempts` (períodos cortos) y `player_benchmark_stats` (histórico).
- `leaderboard_snapshots` diario (top N + posición de cada jugador) → alimenta **"posición histórica"** y el gráfico "tu posición en el tiempo" sin recomputar el pasado.

### API

```
GET /v1/leaderboards?scope=classroom&scopeId=…&benchmark=reaction-time
                    &period=30d&metric=best&around=me&limit=10
```
- `around=me`: devuelve top 3 + vecindario del jugador (modo alumno anti-frustración, doc 05 §5.1).
- Respuesta incluye siempre `myEntry {rank, value, delta7d}` — "subiste 2 puestos esta semana".

## 4. Reglas de elegibilidad y equidad

- Mínimo de intentos por métrica (evita rankear con 1 partida de suerte): best=1, avg=3, consistency=5, progress=5.
- Solo intentos `COMPLETED` y no `INVALID` (doc 07 §anti-cheat) cuentan.
- Rankings por **edad** usan `player_age` congelada en el intento (la edad al jugar).
- Alumnos desactivados desaparecen de rankings vigentes pero permanecen en snapshots históricos.
- Ranking global (Modo Libre): solo guests **con alias opt-in**; con moderación básica de alias (lista de palabras bloqueadas) y sin ningún dato más que alias+valor.

## 5. Presentación según audiencia

| Audiencia | Vista |
|---|---|
| Alumno | Top 3 + su vecindario, su delta semanal, encuadre positivo. Lista completa solo si la institución lo habilita. |
| Docente | Lista completa, todas las métricas, comparación entre cursos, export. |
| Proyección en clase | Modo "podio del día/semana" rotando métricas (mejor marca → más partidas → más progreso → más constante) para que ganen distintos chicos. |
