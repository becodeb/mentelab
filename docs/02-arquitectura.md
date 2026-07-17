# 02 — Arquitectura

## 1. Vista general

```
┌────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (tablet / notebook)           │
│  Next.js (React 18, TS, Tailwind, shadcn/ui, Framer Motion)    │
│  - Juegos corren 100% client-side (precisión de timing)       │
│  - Buffer local de eventos → envío batch al finalizar         │
│  - TanStack Query para estado de servidor                      │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTPS / REST JSON (cookies httpOnly)
┌──────────────────────────▼─────────────────────────────────────┐
│                    API — Express + TypeScript                  │
│  Módulos por dominio: auth / institutions / players /          │
│  attempts / gamification / leaderboards / analytics / exports  │
│  Validación Zod en el borde · Prisma ORM · JWT sesiones        │
└──────────┬──────────────────────────────┬──────────────────────┘
           │                              │
┌──────────▼──────────┐        ┌──────────▼──────────┐
│  PostgreSQL          │        │  Redis               │
│  - modelo relacional │        │  - leaderboards (ZSET)│
│  - event log         │        │  - caché dashboards  │
│    particionado      │        │  - rate limiting     │
│  - agregados         │        │  - sesiones de clase │
└──────────────────────┘        └──────────────────────┘
```

- **Los juegos son 100 % client-side**: el timing (reaction time, latencias) se mide en el navegador con `performance.now()` (resolución sub-ms, monotónico). El servidor nunca participa durante la partida — solo recibe el paquete completo al final. Esto elimina la latencia de red como fuente de error de medición.
- **Envío en batch**: al finalizar (o abandonar) un intento, el cliente envía `attempt summary + events[]` en un solo POST. Si falla la red, el paquete se guarda en IndexedDB y se reintenta (outbox pattern) — clave para tablets escolares con WiFi inestable.

## 2. Monorepo

pnpm workspaces + Turborepo:

```
mentelab/
├── apps/
│   ├── web/            → Next.js (App Router). UI alumnos, docentes, modo libre.
│   └── api/            → Express + TS. REST API.
├── packages/
│   ├── db/             → schema.prisma, cliente Prisma, migraciones, seeds.
│   ├── shared/         → tipos TS + schemas Zod compartidos (DTOs, enums,
│   │                     contratos de eventos). Fuente única de verdad.
│   ├── benchmarks/     → EL corazón: definición de cada benchmark
│   │                     (ver §3). Lógica pura, sin React ni Express.
│   └── config/         → eslint, prettier, tsconfig compartidos.
├── docs/               → esta documentación.
└── turbo.json / pnpm-workspace.yaml
```

**Por qué Express separado y no solo Next.js API routes**: pedido explícito del proyecto, y además: (a) los endpoints de ingesta de eventos y leaderboards se benefician de un proceso dedicado escalable horizontalmente sin arrastrar el SSR; (b) permite en el futuro mover analytics/exports a workers sin tocar el frontend.

## 3. Sistema de benchmarks como plugins (extensibilidad)

Cada benchmark es un módulo en `packages/benchmarks/src/<slug>/` que implementa un contrato único. **Agregar un benchmark nuevo = crear una carpeta + registrarla. Cero cambios en DB, API o infraestructura.**

```ts
// packages/benchmarks/src/types.ts
export interface BenchmarkDefinition<TConfig, TMetrics, TEvent> {
  slug: string;                    // "reaction-time" — clave estable en DB
  name: LocalizedString;           // "Tiempo de Reacción"
  icon: string;                    // nombre de ícono
  category: BenchmarkCategory;     // SPEED | MEMORY | ATTENTION | PRECISION | TYPING
  minAge: number;                  // edad mínima recomendada

  configSchema: ZodSchema<TConfig>;     // parámetros de dificultad
  metricsSchema: ZodSchema<TMetrics>;   // métricas resumen del intento
  eventSchema: ZodSchema<TEvent>;       // eventos crudos válidos

  defaultConfigFor(age: number): TConfig;        // dificultad adaptable
  computeMetrics(events: TEvent[]): TMetrics;    // función PURA (testeable)
  score(metrics: TMetrics): number;              // puntaje canónico
  scoreDirection: "higher_better" | "lower_better";
  normalize(score: number, age: number): number; // → 0..100 (para perfil
                                                 //   cognitivo y comparaciones)
  contributions: Partial<Record<CognitiveIndicator, number>>;
                                   // pesos hacia el perfil cognitivo (doc 05)
  rankingMetrics: RankingMetricDef[];  // qué métricas son rankeables
}
```

- `computeMetrics` corre **en el cliente** (feedback inmediato) y **se re-ejecuta en el servidor** sobre los eventos recibidos (misma función, mismo paquete) — el servidor confía en su propio cálculo, no en el del cliente. Anti-trampa barato y consistencia garantizada.
- La UI de cada juego vive en `apps/web/src/benchmarks/<slug>/` implementando `BenchmarkGameProps` (recibe config, emite eventos tipados, señala fin). Un `GameShell` común provee: instrucciones, tutorial, countdown, pausa, captura de `visibilitychange`/`blur`, medición de FPS, pantalla de resultados y celebraciones.
- Registro central: `packages/benchmarks/src/registry.ts` exporta `benchmarkRegistry: Map<slug, BenchmarkDefinition>`. API y web iteran el registry; la DB guarda `benchmark_slug` como string — no hay tabla de benchmarks que migrar.

### Los 8 benchmarks iniciales y sus métricas específicas

| Benchmark | Eventos crudos guardados | Métricas resumen (además de score/duración/errores) |
|---|---|---|
| **Reaction Time** | cada ronda: t. de aparición, t. de click, falso positivo (click antes de tiempo) | tiempos por ronda, media, mediana, mejor, peor, desvío estándar, falsos positivos, anticipaciones (<120 ms), tendencia intra-sesión |
| **Sequence Memory** | cada celda mostrada y cada click (con latencia) | nivel máximo, latencia media por click, errores por nivel, en qué posición de la secuencia falló |
| **Aim Trainer** | cada target: posición (x,y), t. de aparición, t. de hit, distancia del click al centro | t. medio por target, precisión espacial (px al centro), overshoots, velocidad angular, mapa de calor de errores |
| **Number Memory** | dígitos mostrados, respuesta tipeada, t. de memorización usado, t. de tipeo | nivel máx (dígitos), dígitos correctos por posición, tipo de error (transposición/omisión/sustitución) |
| **Verbal Memory** | cada palabra: vista/nueva, respuesta, latencia | racha, aciertos/errores por tipo (falso "visto" vs falso "nuevo"), latencia media, curva de fatiga |
| **Chimp Test** | posiciones de números, orden de clicks, latencia por click | nivel máx, strikes, latencia por posición ordinal, errores por distancia espacial |
| **Visual Memory** | patrón mostrado, cada click (correcto/incorrecto), latencias | nivel máx, precisión por nivel, vidas usadas, patrón de barrido (orden de clicks) |
| **Typing Test** | cada keystroke con timestamp (tecla, correcta/incorrecta, backspace) | WPM, WPM neto, precisión, latencia inter-tecla, errores por carácter, ritmo (desvío del intervalo entre teclas) |

Todos además registran los **eventos comunes** capturados por `GameShell`: `focus_lost`, `focus_gained`, `paused`, `resumed`, `tutorial_shown`, `countdown_start`, `game_start`, `game_end`, `abandoned` — con timestamp relativo de alta resolución.

## 4. Módulos del backend (Express)

```
apps/api/src/
├── modules/
│   ├── auth/            → providers modulares (doc 07)
│   ├── institutions/    → instituciones, años, grados, cursos
│   ├── players/         → alumnos e invitados, import CSV, movimientos
│   ├── attempts/        → ingesta de intentos + eventos, validación,
│   │                      recomputo server-side de métricas
│   ├── gamification/    → XP, niveles, rachas, misiones, insignias (doc 05)
│   ├── leaderboards/    → rankings Redis + fallback SQL (doc 06)
│   ├── profile/         → estadísticas personales, perfil cognitivo
│   ├── analytics/       → dashboards docentes (agregaciones)
│   └── exports/         → CSV / XLSX streaming
├── core/                → errores, logger (pino), middleware (auth, tenant
│                          scoping, rate limit, zod-validate), redis, prisma
└── server.ts
```

Cada módulo: `routes.ts` (rutas + validación Zod) → `service.ts` (lógica) → acceso a datos vía Prisma. Sin lógica en controladores. Los servicios reciben siempre un `RequestContext { actor, institutionId | null }` — **ninguna query se ejecuta sin scoping de tenant** (ver doc 07 §multi-tenancy).

## 5. Flujo de un intento (el camino crítico)

```
1. POST /v1/attempts/start        { benchmarkSlug }
   → server crea Attempt (status=IN_PROGRESS), devuelve attemptId + config
     (dificultad adaptada a la edad y al historial del jugador)
2. [el alumno juega — todo local, eventos en buffer en memoria]
3. POST /v1/attempts/:id/complete { events[], clientMetrics, device }
   → valida eventos contra eventSchema del benchmark
   → recomputa metrics server-side (computeMetrics)
   → persiste Attempt (summary) + AttemptEvents (batch insert)
   → transacción de gamificación: XP, racha, récords, misiones, insignias
   → actualiza leaderboards en Redis (ZADD)
   → responde: métricas oficiales + recompensas ganadas + posición
4. La pantalla de resultados del cliente muestra todo con animaciones.
```

Si el paso 3 falla por red: outbox en IndexedDB con reintento exponencial. El `attemptId` hace la operación idempotente (reintentos no duplican).

## 6. Escalabilidad (50 → 500 instituciones, millones de partidas)

- **Escritura**: el único endpoint caliente es `complete`. Insert batch de eventos + índices mínimos en la tabla de eventos (solo PK y attempt_id). Postgres particionado por mes absorbe millones de filas sin degradar (doc 03).
- **Lectura**: dashboards leen **agregados precalculados** (`player_benchmark_stats`, vistas materializadas por curso), nunca escanean eventos. Los eventos crudos solo se leen en drill-down de un intento puntual o en exports/análisis offline.
- **Rankings**: Redis sorted sets, O(log N) por update, O(log N + K) por página. Reconstruibles desde SQL en cualquier momento.
- **API stateless** → réplicas horizontales detrás de un load balancer cuando haga falta. Sesiones en JWT (cookie), no en memoria.
- **Jobs asíncronos** (fase 2+): recálculo de perfil cognitivo, snapshots diarios de rankings, refresh de vistas materializadas — con `pg_cron`/worker simple primero, cola (BullMQ sobre el mismo Redis) si el volumen lo exige.

## 7. Calidad de código

- TypeScript `strict` en todo el monorepo; ESLint + Prettier compartidos desde `packages/config`.
- Zod como única fuente de validación; los tipos se infieren de los schemas (`z.infer`) — imposible que DTO y validación diverjan.
- Lógica de juego y scoring = **funciones puras** en `packages/benchmarks` → unit tests triviales (Vitest).
- Testing: Vitest (unit, desde el MVP en scoring/gamificación), Testing Library (componentes críticos), Playwright (e2e, fase 2).
- Convención de commits + CI (lint, typecheck, test) desde el día 1.
