# 03 — Modelo de datos y estrategia de almacenamiento

## 1. Estrategia general

Tres capas, cada una con un propósito distinto:

| Capa | Tablas | Propósito | Se lee en |
|---|---|---|---|
| **Event log** (append-only, jamás se modifica) | `attempt_events` | Verdad cruda. Cada click, keystroke, pérdida de foco. Permite recalcular todo en el futuro. | Drill-down, exports, análisis offline |
| **Resumen por intento** | `attempts` | Una fila por partida con métricas precalculadas (JSONB tipado por benchmark) + columnas indexables comunes. | Historial, gráficos de evolución |
| **Agregados** | `player_benchmark_stats`, `personal_bests`, `cognitive_scores`, vistas materializadas | Lecturas O(1) para perfiles, dashboards y rankings SQL. Derivables: se pueden reconstruir desde las capas inferiores. | Todo lo caliente |

Reglas de oro:

1. **Nunca se hace UPDATE ni DELETE sobre `attempts` ni `attempt_events`** (salvo `attempts.status` al completarse). Desactivar un alumno = flag; mover de curso = nueva fila de matriculación; el historial es sagrado.
2. **Los dashboards jamás escanean eventos.** Si una consulta nueva necesita eventos, se crea un agregado nuevo y se backfillea.
3. **Columna promovida vs JSONB**: lo que se filtra/ordena/rankea → columna real indexada. Lo específico de cada benchmark → JSONB validado por el `metricsSchema` del plugin. Así agregar un benchmark no requiere migración.

## 2. Esquema (Prisma, resumido — nombres de tabla en snake_case)

### Identidad y organización

```prisma
model Institution {
  id        String  @id @default(uuid())
  name      String
  slug      String  @unique          // "escuela-san-martin"
  settings  Json    @default("{}")   // género habilitado, rankings visibles, etc.
  active    Boolean @default(true)
  createdAt DateTime @default(now())
}

model SchoolYear {        // "2026"
  id            String @id @default(uuid())
  institutionId String
  name          String                 // "2026"
  startsAt      DateTime
  endsAt        DateTime
  active        Boolean @default(true)
  @@unique([institutionId, name])
}

model Grade {             // "1er Grado" — nivel dentro de la institución
  id            String @id @default(uuid())
  institutionId String
  name          String                 // "1er Grado"
  level         Int                    // 1..12 (orden y comparación entre años)
  typicalAge    Int                    // 6 → rankings por edad
  @@unique([institutionId, level])
}

model Classroom {         // división concreta en un año: "1° A (2026)"
  id            String @id @default(uuid())
  institutionId String
  schoolYearId  String
  gradeId       String
  division      String                 // "A"
  classCode     String @unique         // "SOL-42" — para login rápido / QR
  active        Boolean @default(true)
  @@unique([institutionId, schoolYearId, gradeId, division])
}

model StaffUser {         // docentes y admins
  id            String  @id @default(uuid())
  institutionId String?                // null → SUPER_ADMIN
  role          StaffRole              // TEACHER | INSTITUTION_ADMIN | SUPER_ADMIN
  name          String
  email         String  @unique
  passwordHash  String
  active        Boolean @default(true)
}

model TeacherClassroom {  // qué docente ve qué cursos
  staffUserId String
  classroomId String
  @@id([staffUserId, classroomId])
}
```

### Jugadores (alumnos + invitados unificados)

Un solo concepto `Player` es dueño de intentos, XP, insignias y récords. Esto hace que **toda la lógica de juego/gamificación sea idéntica para alumnos e invitados**, y que migrar un invitado a alumno sea trivial (ver §5).

```prisma
model Player {
  id          String     @id @default(uuid())
  type        PlayerType             // STUDENT | GUEST
  displayName String                 // nombre visible ("Juli P." / alias invitado)
  avatarId    String                 // avatar elegible por el chico
  birthYear   Int?                   // para normalización por edad
  gender      Gender?                // opcional, solo si la institución lo usa
  active      Boolean @default(true)
  createdAt   DateTime @default(now())
}

model StudentProfile {
  playerId      String @id
  institutionId String                // aislamiento de tenant
  firstName     String
  lastName      String
  secretType    SecretType            // PIN4 | PICTURE   (clave simple)
  secretHash    String
  // curso actual desnormalizado para lecturas rápidas:
  classroomId   String
}

model Enrollment {        // historial de matriculación (mover de curso NO pierde datos)
  id          String   @id @default(uuid())
  playerId    String
  classroomId String
  fromDate    DateTime @default(now())
  toDate      DateTime?               // null = vigente
}

model GuestProfile {
  playerId       String  @id
  deviceUuid     String  @unique      // UUID generado en el navegador
  alias          String?              // solo si quiere aparecer en ranking global
  migratedToId   String?              // playerId destino si se migró
}
```

### Intentos y eventos (el corazón)

```sql
-- attempts: particionada por RANGE (started_at), particiones mensuales.
CREATE TABLE attempts (
  id               UUID        NOT NULL,
  player_id        UUID        NOT NULL,
  benchmark_slug   TEXT        NOT NULL,          -- clave del registry
  -- contexto desnormalizado al momento de jugar (histórico correcto aunque
  -- el alumno cambie de curso después):
  institution_id   UUID,                          -- NULL = Modo Libre
  classroom_id     UUID,
  grade_level      INT,
  player_age       INT,                           -- edad al jugar
  scope            TEXT        NOT NULL,          -- 'INSTITUTIONAL' | 'GLOBAL'
  -- ciclo de vida:
  status           TEXT        NOT NULL,          -- IN_PROGRESS|COMPLETED|ABANDONED|INVALID
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_ms      INT,
  -- resultado canónico (comparable y rankeable):
  score            DOUBLE PRECISION,              -- semántica según benchmark
  score_normalized DOUBLE PRECISION,              -- 0..100 ajustado por edad
  level_reached    INT,
  error_count      INT,
  success_count    INT,
  -- todo lo específico del benchmark (validado por metricsSchema):
  metrics          JSONB,
  config           JSONB,                         -- dificultad/parámetros usados
  -- calidad del dato:
  focus_lost_count INT  DEFAULT 0,
  pause_count      INT  DEFAULT 0,
  avg_fps          REAL,
  device           JSONB,      -- {browser, os, deviceType, screenW, screenH,
                               --  dpr, inputType: touch|mouse|keyboard, ua}
  session_id       UUID,       -- sesión de uso (agrupa intentos seguidos)
  app_version      TEXT,
  PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

CREATE INDEX ON attempts (player_id, benchmark_slug, started_at DESC);
CREATE INDEX ON attempts (institution_id, benchmark_slug, started_at DESC)
  WHERE status = 'COMPLETED';
CREATE INDEX ON attempts (classroom_id, benchmark_slug, started_at DESC)
  WHERE status = 'COMPLETED';

-- attempt_events: particionada igual. Append-only. Índice mínimo (barata de escribir).
CREATE TABLE attempt_events (
  attempt_id  UUID        NOT NULL,
  seq         INT         NOT NULL,   -- orden dentro del intento
  t_ms        DOUBLE PRECISION NOT NULL, -- ms desde game_start (performance.now)
  type        TEXT        NOT NULL,   -- 'round_result','click','keystroke','focus_lost',...
  payload     JSONB,
  started_at  TIMESTAMPTZ NOT NULL,   -- clave de partición (= attempts.started_at)
  PRIMARY KEY (attempt_id, seq, started_at)
) PARTITION BY RANGE (started_at);
```

**Por qué así:**
- **Particiones mensuales** (creadas automáticamente por job): con millones de filas, los índices se mantienen chicos, el vacuum es local y archivar/exportar un mes viejo es `DETACH PARTITION`. BRIN adicional sobre `started_at` para escaneos analíticos.
- **Contexto desnormalizado en el intento** (`classroom_id`, `grade_level`, `player_age`): un ranking histórico de "1° A 2026" debe reflejar quién estaba en ese curso *al jugar*, no dónde está el alumno hoy. Además evita joins en las queries analíticas más frecuentes.
- **`scope` explícito** + `institution_id NULL` para Modo Libre: imposible mezclar datos institucionales y globales — toda query de ranking/analytics filtra por `scope` y tenant (doc 07).
- **`t_ms` relativo** de alta resolución: los análisis de latencia no dependen del reloj del sistema.

### Sesiones y agregados

```prisma
model PlaySession {       // una "sentada" de juego (agrupa intentos)
  id        String   @id @default(uuid())
  playerId  String
  startedAt DateTime
  endedAt   DateTime?
  device    Json
}

model PlayerBenchmarkStats {   // agregado caliente, actualizado on-write
  playerId       String
  benchmarkSlug  String
  totalAttempts  Int
  totalPlayMs    BigInt
  bestScore      Float
  bestAt         DateTime
  avgAllTime     Float
  avg30d         Float                 // recalculado por job nocturno
  consistency30d Float?                // 1 - coef. de variación (doc 06)
  improvement30d Float?                // pendiente de regresión sobre 30 días
  lastPlayedAt   DateTime
  @@id([playerId, benchmarkSlug])
}

model PersonalBest {      // histórico de récords (cada vez que rompe uno)
  id            String   @id @default(uuid())
  playerId      String
  benchmarkSlug String
  metric        String                 // "score" | métricas rankeables extra
  value         Float
  attemptId     String
  achievedAt    DateTime
}
```

### Gamificación (detalle en doc 05)

```prisma
model PlayerProgress {    // estado vivo de gamificación
  playerId       String  @id
  xp             Int     @default(0)
  level          Int     @default(1)
  currentStreak  Int     @default(0)   // días consecutivos
  longestStreak  Int     @default(0)
  lastPlayedDate DateTime?             // fecha (día) del último juego
  totalAttempts  Int     @default(0)
  totalPlayMs    BigInt  @default(0)
}

model XpTransaction {     // ledger append-only — auditable, nunca se edita
  id        String   @id @default(uuid())
  playerId  String
  amount    Int
  reason    String                     // 'attempt','personal_record','mission',...
  refId     String?                    // attemptId / missionCode / badgeCode
  createdAt DateTime @default(now())
}

model PlayerBadge {
  playerId  String
  badgeCode String                     // catálogo definido en código
  earnedAt  DateTime @default(now())
  refId     String?
  @@id([playerId, badgeCode])
}

model PlayerMission {     // instancia diaria de misión
  id          String   @id @default(uuid())
  playerId    String
  missionCode String
  date        DateTime @db.Date
  progress    Int      @default(0)
  target      Int
  completedAt DateTime?
  @@unique([playerId, missionCode, date])
}

model CognitiveScore {    // perfil cognitivo por período (doc 05 §4)
  playerId    String
  indicator   String                   // 'reaction_speed','working_memory',...
  value       Float                    // 0..100
  sampleSize  Int
  windowEnd   DateTime @db.Date        // serie temporal semanal
  @@id([playerId, indicator, windowEnd])
}

model LeaderboardSnapshot {  // foto diaria para "posición histórica"
  id        String   @id @default(uuid())
  scopeKey  String                     // ej: "classroom:<id>:reaction-time:best"
  date      DateTime @db.Date
  rankings  Json                       // top N + posiciones de todos (comprimido)
  @@unique([scopeKey, date])
}
```

## 3. Volumetría estimada (validación de escala)

Escenario 500 instituciones × 300 alumnos activos × 20 intentos/mes:

- `attempts`: ~3 M filas/mes → 36 M/año. Con particiones mensuales: ~3 M filas por partición — trivial para Postgres con los índices definidos.
- `attempt_events`: ~60 eventos/intento promedio → ~180 M filas/mes. Sigue siendo manejable particionado (inserts batch, un solo índice PK, BRIN para rango). Si algún día duele: las particiones viejas se archivan a Parquet/S3 y se consultan con DuckDB — el diseño append-only lo permite sin tocar la app.
- Agregados y gamificación: proporcionales a jugadores (~150 K filas), irrelevante.

## 4. Redis (estructuras)

| Clave | Tipo | Contenido | TTL |
|---|---|---|---|
| `lb:{scope}:{benchmark}:{period}:{metric}` | ZSET | member=playerId, score=valor. Ej: `lb:classroom:abc:reaction-time:30d:best` | period-relativo (día: 48 h, semana: 8 d, 30d: rolling por job, histórico: sin TTL) |
| `cache:analytics:{hash}` | STRING (JSON) | respuesta de dashboard | 5 min |
| `classsession:{code}` | HASH | sesión de clase proyectada (QR activo) | 12 h |
| `rl:{ip}` / `rl:player:{id}` | contador | rate limiting | 1 min |

Redis es **siempre derivado**: si se pierde, un comando reconstruye los ZSET desde `attempts`/`player_benchmark_stats`.

## 5. Migración invitado → alumno

1. El invitado juega con `Player(type=GUEST)` + `deviceUuid` en localStorage.
2. Al recibir credenciales de institución, en su primer login desde ese dispositivo la app detecta el `deviceUuid` y ofrece: *"¿Querés llevar tu historial?"*.
3. Si acepta (y el docente lo permite en settings): los `attempts` del guest se re-asignan al `playerId` del alumno **pero conservan `scope='GLOBAL'` e `institution_id=NULL`** — cuentan para su XP, rachas e historial personal, pero jamás entran en rankings ni analytics institucionales (fueron jugados fuera de condiciones de aula).
4. `GuestProfile.migratedToId` queda registrado; el guest no puede volver a usarse.

## 6. Retención y privacidad de datos

- Los intentos se conservan indefinidamente (requisito). 
- Datos personales mínimos: nombre, apellido, año de nacimiento, curso. Sin email ni foto de alumnos.
- Si una institución se va: export completo + borrado físico de PII (`StudentProfile`) manteniendo opcionalmente intentos **anonimizados** (playerId sin nombre) para estadística, según contrato.
- Backups: PITR (WAL) + snapshot diario. El event log es la fuente para reconstruir cualquier agregado.
