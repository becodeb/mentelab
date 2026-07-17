# MenteLab — Documentación de diseño

Plataforma web de medición y entrenamiento de habilidades cognitivas para instituciones educativas, inspirada en Human Benchmark pero centrada en **progreso individual, retención y captura exhaustiva de datos longitudinales**.

> Estado: **diseño completo, pendiente de aprobación**. La implementación comienza tras aprobar las decisiones listadas abajo.

## Índice

| Doc | Contenido |
|---|---|
| [01 — Visión y casos de uso](01-vision-y-casos-de-uso.md) | Visión, principios, no-objetivos, actores, casos de uso, métricas de éxito |
| [02 — Arquitectura](02-arquitectura.md) | Monorepo, sistema de benchmarks como plugins, módulos del backend, flujo del intento, escalabilidad |
| [03 — Modelo de datos](03-modelo-de-datos.md) | Estrategia de 3 capas (event log / resumen / agregados), esquema completo, particionado, volumetría, Redis, migración guest→alumno |
| [04 — Flujos y wireframes](04-flujos-y-wireframes.md) | Login alumno, partida, perfil, panel docente, Modo Libre, accesibilidad |
| [05 — Gamificación y perfil cognitivo](05-gamificacion-y-perfil-cognitivo.md) | XP, niveles, insignias, misiones, rachas, anti-frustración, los 8 indicadores cognitivos |
| [06 — Rankings](06-rankings.md) | Dimensiones, métricas, Redis ZSET, equidad, separación institucional/global |
| [07 — Seguridad y autenticación](07-seguridad-y-autenticacion.md) | Auth modular por providers, multi-tenancy (app + RLS), privacidad de menores, anti-cheat |
| [08 — API](08-api.md) | REST v1 completa, convenciones, endpoints por módulo |
| [09 — Frontend](09-frontend.md) | Rutas, componentes, motor de juego (GameShell), design system, accesibilidad, rendimiento |
| [10 — Roadmap y MVP](10-roadmap-mvp.md) | Fases 0–4, alcance del MVP, criterios de éxito, riesgos |

## Decisiones clave (a aprobar)

1. **Login alumno**: código de clase/QR + dispositivo recordado + grilla de nombres con avatar + clave simple (3 imágenes para chicos, PIN4 para grandes). Combina las 4 opciones del brief en capas. → doc 04 §1
2. **Modo Libre**: jugador invitado anónimo por deviceUuid, datos en el servidor con `scope='GLOBAL'` (misma infraestructura, separación estructural), ranking mundial opt-in por alias, migración de historial posible. → docs 03 §5, 04 §5
3. **Datos**: event log append-only particionado por mes + resumen por intento (JSONB tipado por benchmark) + agregados precalculados. Nada se sobrescribe jamás. → doc 03
4. **Extensibilidad**: cada benchmark es un plugin (contrato TS con schemas Zod, scoring puro, contribuciones al perfil cognitivo). Agregar uno no toca DB ni API. → doc 02 §3
5. **Anti-frustración**: XP solo por proceso (jugar/volver/mejorar), rankings con vista "top 3 + vecindario" para alumnos, métricas de progreso/constancia como rankings de primera clase. → docs 05, 06
6. **Stack**: monorepo pnpm+Turborepo · Next.js (web) · Express (API) · Prisma+PostgreSQL · Redis · según lo especificado en el brief.
7. **MVP**: 4 benchmarks + login + gamificación núcleo + panel docente con CSV + ranking por curso, para pilotear con instituciones reales. → doc 10
