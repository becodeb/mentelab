# 08 — Diseño de la API (REST v1)

Convenciones: prefijo `/v1`; JSON; errores `{ error: { code, message, details? } }` con códigos estables; validación Zod en el borde; paginación por cursor (`?cursor=&limit=`); autenticación por cookie httpOnly; los schemas de request/response viven en `packages/shared` y se comparten con el frontend (tipado end-to-end). Documentación OpenAPI generada desde los schemas Zod (`zod-openapi`) servida en `/v1/docs`.

## Auth

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/auth/class/:classCode` | Resuelve código de clase → curso + grilla de alumnos `{id, displayName, avatarId}` (público, rate-limited) |
| POST | `/v1/auth/student/login` | `{playerId, secret}` → cookie de sesión |
| POST | `/v1/auth/staff/login` | `{email, password}` → cookie (+ refresh) |
| POST | `/v1/auth/guest/init` | `{deviceUuid}` → sesión guest (crea Player perezosamente) |
| POST | `/v1/auth/logout` · GET | `/v1/auth/me` | sesión actual (principal + contexto) |
| POST | `/v1/auth/guest/migrate` | vincula historial guest al alumno logueado (doc 03 §5) |

## Catálogo y partidas (camino crítico)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/benchmarks` | Registry serializado: slug, nombre, ícono, categoría, edad mínima, métricas rankeables |
| POST | `/v1/attempts/start` | `{benchmarkSlug}` → `{attemptId, config}` (dificultad adaptada) |
| POST | `/v1/attempts/:id/complete` | `{events[], clientMetrics, device, avgFps, focusLost, pauses}` → `{metrics, score, rewards: {xp, levelUp?, newBadges[], missionsAdvanced[], personalRecord?}, rank?}`. **Idempotente por attemptId.** |
| POST | `/v1/attempts/:id/abandon` | registra abandono con los eventos que haya |
| GET | `/v1/attempts?playerId=&benchmark=&from=&to=` | historial (alumno: solo propio; docente: sus cursos) |
| GET | `/v1/attempts/:id` | detalle + `?includeEvents=true` (drill-down timeline) |

## Perfil y progreso del jugador

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/me/summary` | hub: XP, nivel, racha, misiones de hoy, últimos juegos |
| GET | `/v1/me/stats/:benchmarkSlug` | récord, promedio, evolución (serie para gráfico), % mejora, posición actual/histórica |
| GET | `/v1/me/cognitive-profile` | 8 indicadores con serie temporal |
| GET | `/v1/me/badges` · `/v1/me/missions` | colecciones |

## Rankings

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/leaderboards` | `?scope=classroom|grade|age|institution|global &scopeId= &benchmark= &period=today|7d|30d|year|all &metric=best|avg|consistency|count|progress &around=me &limit=` (doc 06) |
| GET | `/v1/leaderboards/history` | posición del jugador en el tiempo (snapshots) |

## Gestión institucional (staff)

| Método | Ruta | Descripción |
|---|---|---|
| CRUD | `/v1/institutions` (super admin) · `/v1/school-years` · `/v1/grades` · `/v1/classrooms` | estructura organizativa |
| GET | `/v1/classrooms/:id/students` | con stats resumidas |
| POST | `/v1/students` | alta manual |
| POST | `/v1/students/import` | CSV multipart → `{preview[], errors[]}`; `POST /import/confirm` ejecuta |
| PATCH | `/v1/students/:id` | editar nombre / avatar / desactivar |
| POST | `/v1/students/:id/move` | `{toClassroomId}` — cierra Enrollment y abre nueva |
| POST | `/v1/students/:id/reset-secret` | nueva clave simple, devuelve credencial imprimible |
| POST | `/v1/class-sessions` | inicia sesión de clase (QR) → `{code, qrPayload, expiresAt}` |
| GET | `/v1/class-sessions/:code/live` | actividad en vivo (polling) |
| CRUD | `/v1/staff` (admin institucional) | docentes, asignación de cursos |

## Analytics y exports (staff)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/analytics/overview` | `?classroomId=|gradeId=|institution &benchmark= &period=` → tarjetas resumen |
| GET | `/v1/analytics/distribution` | histograma + boxplot (bins precalculados server-side) |
| GET | `/v1/analytics/evolution` | series temporales con banda de percentiles |
| GET | `/v1/analytics/heatmap` | actividad día×hora |
| GET | `/v1/analytics/compare` | `?dimension=classroom|grade|age|gender|benchmark&ids=…` → series comparadas |
| GET | `/v1/analytics/students-at-risk` | inactivos ≥ N días / tendencia negativa |
| GET | `/v1/exports/attempts.csv` · `.xlsx` | streaming con los mismos filtros de analytics; opción `raw=events` para eventos crudos |

Notas de rendimiento: `analytics/*` lee agregados/vistas materializadas con caché Redis 5 min; `exports` hace streaming por cursor (nunca carga todo en memoria); `complete` es la única ruta optimizada a fondo para escritura (transacción única + pipeline Redis).
