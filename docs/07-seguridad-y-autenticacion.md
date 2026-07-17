# 07 — Seguridad, autenticación y multi-tenancy

Postura declarada del producto: **para alumnos, facilidad > seguridad**; lo que sí es innegociable es (a) el aislamiento entre instituciones, (b) la protección de los paneles docentes/admin, y (c) la privacidad de datos de menores.

## 1. Autenticación modular (provider pattern)

El módulo `auth` expone un contrato único; cada mecanismo es un provider intercambiable. Agregar Google/Microsoft/password mañana = agregar un provider, sin tocar el resto de la app.

```ts
interface AuthProvider {
  id: string;                               // 'student-secret' | 'staff-password'
                                            // | 'guest-device' | (futuro) 'google'...
  authenticate(input: unknown): Promise<AuthResult>;  // → Principal o rechazo
}

type Principal =
  | { kind: "student"; playerId: string; institutionId: string; classroomId: string }
  | { kind: "staff";   staffId: string; role: StaffRole; institutionId: string | null }
  | { kind: "guest";   playerId: string };
```

Resultado: **JWT firmado en cookie httpOnly + SameSite=Lax** (access 15 min + refresh 7 días con rotación para staff; para alumnos, sesión de 12 h — dura la jornada escolar, se renueva al jugar). Sin estado de sesión en el servidor → API horizontal.

### Providers iniciales

| Provider | Mecánica | Protecciones |
|---|---|---|
| `student-secret` | classCode → playerId elegido en grilla → PIN4 o secuencia de 3 imágenes. Hash con bcrypt (costo bajo — el secreto es de baja entropía por diseño). | Rate limit por playerId (5 intentos/min) y por IP; tras 5 fallos, bloqueo 1 min con mensaje amable ("pedile ayuda a tu seño"). El docente resetea claves. |
| `staff-password` | email + password (bcrypt costo 12), política de longitud mínima 10. | Rate limit, bloqueo incremental, audit log de logins. 2FA TOTP opcional en fase 3. |
| `guest-device` | deviceUuid (UUID v4 generado client-side, localStorage). Sin challenge — es anónimo por diseño. | Rate limit por IP para creación de guests (anti-flood). |
| `class-session` (QR) | El QR codifica `classCode + token efímero` (Redis, TTL 12 h). No autentica por sí solo — acelera llegar a la grilla del curso. | Token efímero evita QRs viejos circulando. |

### Amenaza aceptada y mitigada

Un compañero puede conocer el PIN de otro (riesgo asumido: impacto = jugar a nombre de otro). Mitigaciones proporcionales: el docente ve dispositivo/horario de cada intento (detección a posteriori), reseteo de clave en 2 clicks, y los intentos sospechosos pueden marcarse `INVALID` (excluidos de rankings, nunca borrados).

## 2. Multi-tenancy: aislamiento entre instituciones

Defensa en tres capas:

1. **Capa de aplicación (principal)**: todo servicio recibe `RequestContext` con el `institutionId` del principal **derivado del JWT, jamás del body/query**. Los repositorios exponen métodos que exigen tenant (`findStudents(ctx, …)` inyecta `WHERE institution_id = ctx.institutionId` siempre). Regla de lint: prohibido usar `prisma.player.findMany` fuera del repositorio.
2. **Postgres Row-Level Security (cinturón y tiradores)**: políticas RLS sobre las tablas con `institution_id`, activadas con `SET app.current_institution` por request (Prisma `$extends`). Si un bug de aplicación olvidara el filtro, la DB devuelve cero filas de otra institución.
3. **Datos globales (Modo Libre)**: `scope='GLOBAL'` + `institution_id IS NULL` — las políticas y queries institucionales los excluyen estructuralmente, y el endpoint de rankings globales solo admite scope global (doc 06 §1).

Tests de integración dedicados: "usuario de institución A no puede leer/escribir nada de B" para cada endpoint (matriz automatizada).

## 3. Autorización (RBAC)

| Capacidad | Alumno | Docente | Admin inst. | Super admin |
|---|---|---|---|---|
| Jugar / ver su propio perfil | ✔ | ✔ | ✔ | ✔ |
| Ver rankings de su curso/institución | ✔ (según settings) | ✔ | ✔ | — |
| Ver datos de alumnos | solo los propios | sus cursos (`teacher_classrooms`) | toda la institución | — |
| ABM alumnos/cursos | — | sus cursos | ✔ | — |
| Gestionar docentes / settings | — | — | ✔ | — |
| Crear instituciones | — | — | — | ✔ |
| Datos personales entre instituciones | — | — | — | — (solo métricas agregadas anónimas) |

Middleware `requireRole(...)` + chequeos de propiedad en servicios (un docente solo opera sobre classrooms asignados).

## 4. Privacidad de menores

- **Minimización**: sin email, teléfono ni foto de alumnos. Nombre + año de nacimiento + curso. Género opcional y desactivado por defecto (lo habilita el admin institucional).
- Los alumnos nunca ven apellidos completos de otros ("Juli P."), solo dentro de su propio curso, y nada de otros cursos salvo posiciones agregadas.
- El ranking global jamás contiene alumnos institucionales; los invitados aparecen solo con alias opt-in.
- Export de datos y derecho al olvido por institución (doc 03 §6). Logs de aplicación sin PII (ids, no nombres).
- Cookies: solo las de sesión (first-party, httpOnly). Sin analytics de terceros en las vistas de alumnos.

## 5. Anti-cheat / calidad del dato (proporcional, no paranoide)

El objetivo es **calidad estadística**, no seguridad militar:

- El servidor **recomputa las métricas desde los eventos crudos** (doc 02 §5) — un score inventado sin eventos coherentes no pasa.
- Heurísticas de validación al ingerir: tiempos humanamente imposibles (reaction < 90 ms sostenido), regularidad robótica (desvío ≈ 0), eventos fuera de orden, duración incoherente → `status='INVALID'` (se guarda igual, no rankea, queda visible para el docente con motivo).
- `focus_lost`/`pause` registrados → el docente filtra intentos "limpios" en sus análisis.
- Rate limiting general (por IP y por player) en todos los endpoints de escritura.

## 6. Seguridad de plataforma (checklist)

- HTTPS obligatorio; HSTS. Helmet (CSP estricta — sin scripts de terceros, lo que además beneficia el timing de los juegos).
- Validación Zod de **todo** input en el borde (body, query, params) — nada llega a un servicio sin tipar.
- Prisma parametriza SQL (sin SQL crudo salvo analytics revisadas).
- CORS restringido al dominio del frontend. CSRF: cookies SameSite=Lax + verificación de Origin en mutaciones.
- Secretos por variables de entorno (validadas con Zod al boot); rotación de clave JWT soportada (kid en header).
- Dependencias auditadas en CI (`pnpm audit` + Renovate).
- Audit log de acciones staff (alta/baja/edición de alumnos, exports) — tabla append-only.
