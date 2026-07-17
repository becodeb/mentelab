# 10 — Roadmap: MVP y evolución

Principio: **el MVP ya debe capturar datos con el esquema definitivo** (event log completo desde el día 1). Lo que se recorta es superficie de producto, nunca calidad del dato — así ninguna fase posterior pierde historia.

## Fase 0 — Fundaciones (base técnica)

- Monorepo (pnpm + Turborepo), packages `config`, `shared`, `db`, `benchmarks` (contrato + registry), CI (lint, typecheck, test).
- Postgres + Prisma: esquema completo del doc 03 (incluye particionado de attempts/events).
- Express: core (errores, logger, zod-middleware, contexto de tenant), auth providers `student-secret`, `staff-password`, `guest-device`.
- Next.js: layouts alumno/staff, design tokens, GameShell con clock/buffer/focus/fps.
- Seeds de desarrollo: 1 institución demo, 2 cursos, 30 alumnos, datos sintéticos.

**Criterio de salida**: un benchmark de prueba end-to-end guarda intento + eventos y los recomputa server-side.

## Fase 1 — MVP (piloto con 1–3 instituciones reales)

**Alcance:**
- **4 benchmarks**: Reaction Time, Sequence Memory, Aim Trainer, Number Memory (cubren velocidad, memoria, atención y precisión → perfil cognitivo ya tiene señal).
- Login alumno completo (código de clase + grilla + clave simple + dispositivo recordado).
- Modo Libre básico (guest juega, historial en su dispositivo, sin ranking global aún).
- Gamificación núcleo: XP + niveles + rachas + récords personales + celebraciones (sin misiones ni insignias todavía).
- Perfil alumno: récord, evolución (gráfico), promedio, racha, XP.
- Panel docente: gestión de cursos y alumnos (manual + CSV + mover + desactivar + credenciales imprimibles), tabla de resultados por curso, evolución por alumno, **export CSV**.
- Ranking por curso e institución (mejor marca y cantidad de partidas), períodos semana/30 días/histórico — vía SQL con caché (Redis entra en fase 2 si el piloto no lo exige antes).
- Deploy productivo (una VM/PaaS + Postgres gestionado), backups, monitoreo básico.

**Criterio de éxito del piloto**: alumnos entran solos en <10 s; ≥60 % juega 2+ veces/semana durante un mes; el docente exporta y usa los datos.

## Fase 2 — Producto completo

- Los **8 benchmarks** (+ Verbal Memory, Chimp Test, Visual Memory, Typing Test).
- Gamificación completa: misiones diarias, catálogo de insignias, protector de racha, anti-farming.
- **Perfil cognitivo v1** (8 indicadores, serie temporal, normalización por edad con curvas de referencia).
- Rankings completos: todas las dimensiones y métricas (incl. progreso y consistencia), Redis ZSET, snapshots históricos, modo "podio rotativo" para proyectar.
- Panel docente avanzado: distribuciones, boxplots, percentiles, heatmap de actividad, comparación de cursos/edades/benchmarks, alumnos en riesgo, **export Excel**.
- Dificultad adaptable por historial; tutoriales animados por juego.
- Sesión de clase con QR + vista en vivo.
- Playwright e2e del camino crítico.

## Fase 3 — Escala y apertura

- **Ranking global del Modo Libre** (alias opt-in + moderación) y migración invitado → alumno.
- PWA/offline-first para tablets; audio de instrucciones (lectores iniciales).
- Panel admin institucional completo (docentes, settings, años escolares, comparación entre años).
- Jobs asíncronos formalizados (BullMQ): percentiles poblacionales reales, refresh de vistas materializadas, snapshots.
- RLS activado, audit log, 2FA staff, hardening.
- Rendimiento: réplicas de API, read replica de Postgres para analytics si hace falta.

## Fase 4 — Plataforma

- OAuth (Google/Microsoft) para staff; SSO institucional.
- Multi-idioma (i18n ya preparado desde fase 0, es-AR primero).
- API pública de datos para investigadores (agregada/anonimizada, con convenio).
- Archivado de particiones viejas a Parquet + pipeline de análisis (DuckDB).
- Exploraciones ML: detección de patrones de aprendizaje, alertas tempranas — posible gracias al event log intacto desde el día 1.

## Riesgos principales y mitigación

| Riesgo | Mitigación |
|---|---|
| Los chicos se aburren tras la novedad | Misiones/rachas en fase 2 temprana; medir retención desde el piloto y balancear XP con datos reales |
| WiFi escolar inestable | Outbox offline desde el MVP; juegos 100 % client-side |
| Timing impreciso en tablets viejas | `performance.now()` + registro de FPS/dispositivo → el dato queda calificado, los análisis filtran |
| Docentes no adoptan el panel | Piloto co-diseñado con 2–3 docentes reales; export CSV desde el día 1 (su herramienta conocida) |
| Normalización por edad sin datos al inicio | Curvas de referencia fijas marcadas "beta" hasta tener masa crítica propia |
