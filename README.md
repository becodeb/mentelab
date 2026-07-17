# 🧠 MenteLab

Plataforma web de medición y entrenamiento de habilidades cognitivas para instituciones educativas (primaria y secundaria), inspirada en Human Benchmark pero centrada en **progreso individual, retención y captura exhaustiva de datos longitudinales**.

- 8 benchmarks: Reaction Time, Sequence Memory, Aim Trainer, Number Memory, Verbal Memory, Chimp Test, Visual Memory, Typing Test — extensibles vía sistema de plugins.
- Multi-institución con aislamiento total de datos; Modo Libre público separado estructuralmente.
- Event logging completo (cada click/keystroke), gamificación anti-frustración, perfil cognitivo, rankings multi-dimensión, panel docente con analytics y exportación.

📚 **Diseño completo**: ver [`docs/README.md`](docs/README.md).

## Stack

Monorepo pnpm + Turborepo · Next.js/React/TypeScript/Tailwind (web) · Express/TypeScript (API) · Prisma + PostgreSQL · Redis (opcional, con fallback a SQL) · Vitest.

```
apps/web        → Next.js: alumnos, docentes, modo libre
apps/api        → Express: REST API v1
packages/db     → Prisma schema, migraciones, seed
packages/shared → tipos + schemas Zod compartidos
packages/benchmarks → contrato de plugins + lógica pura de los 8 juegos + gamificación
packages/config → tsconfig compartidos
```

## Desarrollo local

Requisitos: Node ≥ 20, pnpm, Docker.

```bash
pnpm install
docker compose up -d          # Postgres + Redis
pnpm db:migrate               # crea el esquema
pnpm db:seed                  # institución demo + alumnos + datos sintéticos
pnpm dev                      # web en :3000, api en :4000
```

### Credenciales demo (seed)

- **Docente**: `docente@demo.mentelab.ar` / `mentelab-demo`
- **Admin institucional**: `admin@demo.mentelab.ar` / `mentelab-demo`
- **Alumnos**: código de clase `SOL-42` (1° A) — PIN `1111` para todos los alumnos seed.
- **Modo Libre**: sin credenciales, botón "Jugar" en la landing.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | web + api en modo desarrollo |
| `pnpm build` | build de producción de todo |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | calidad |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | base de datos |

## Producción a escala

`packages/db/scripts/partitioning.sql` convierte `attempts` y `attempt_events` a tablas particionadas por mes (ver docs/03). Redis es siempre derivado y reconstruible; si no está disponible, los rankings degradan a SQL con caché.
