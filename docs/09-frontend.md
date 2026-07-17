# 09 — Frontend: estructura, componentes y design system

Stack: Next.js (App Router) · React · TypeScript strict · Tailwind · shadcn/ui · TanStack Query · React Hook Form + Zod · Framer Motion · Recharts.

## 1. Rutas (App Router)

```
apps/web/src/app/
├── (public)/
│   ├── page.tsx                  → landing + Modo Libre
│   └── join/[classCode]/         → llegada por QR
├── (student)/                    → layout lúdico (tipografía grande, colores cálidos)
│   ├── login/                    → grilla del curso + clave
│   ├── play/                     → hub de juegos + misiones
│   ├── play/[slug]/              → GameShell + juego (client component)
│   ├── me/                       → perfil, stats, perfil cognitivo, insignias
│   └── rankings/
├── (staff)/                      → layout sobrio (dashboard)
│   ├── teacher/                  → resumen, cursos, alumnos, analytics, exports
│   └── admin/                    → institución, años, docentes, settings
└── api/ (solo proxy de cookies si hace falta; la API real es Express)
```

Dos layouts visuales radicalmente distintos sobre los mismos tokens: **modo alumno** (grande, animado, cálido) y **modo staff** (denso, neutro, eficiente).

## 2. Estructura de código

```
apps/web/src/
├── benchmarks/                → UI de cada juego (registrada por slug)
│   ├── shell/                 → GameShell, useGameClock, useEventBuffer,
│   │                            useFpsMeter, useFocusGuard, Countdown,
│   │                            TutorialOverlay, ResultsScreen
│   └── reaction-time/ …       → GameComponent por benchmark
├── components/
│   ├── ui/                    → shadcn (Button, Card, Dialog…) + variantes kid
│   ├── gamification/          → XpBar, LevelChip, StreakFlame, BadgeGrid,
│   │                            MissionCard, Celebration (confetti/récord)
│   ├── charts/                → EvolutionChart, DistributionChart (histograma+
│   │                            boxplot), PercentileBand, ActivityHeatmap,
│   │                            CognitiveProfileBars, TrendSpark — wrappers
│   │                            Recharts con tokens del design system
│   └── leaderboard/           → LeaderboardTable, PodiumCard, MyRankBanner
├── features/                  → espejo de los módulos de la API:
│   ├── auth/ · attempts/ · profile/ · leaderboards/ · roster/ · analytics/
│   │   (hooks TanStack Query + api client tipado desde packages/shared)
├── lib/                       → apiClient (fetch + zod parse), outbox
│                                (IndexedDB retry), device-info, i18n (es)
└── stores/                    → estado local mínimo (zustand): sesión de juego
```

### Hooks clave del motor de juego

- `useGameClock()` — tiempos con `performance.now()`, pausable.
- `useEventBuffer(schema)` — acumula eventos tipados en memoria; `flush()` arma el payload de `complete`.
- `useFocusGuard()` — `visibilitychange`/`blur` → auto-pausa + evento `focus_lost`.
- `useFpsMeter()` — rAF sampling → `avgFps` para calidad del dato.
- `useAttempt(slug)` — orquesta start → juego → complete → rewards; integra outbox offline.

## 3. Design system

- **Tokens** (CSS variables + Tailwind config): paleta primaria cálida (índigo/violeta + acentos por categoría de juego: velocidad=ámbar, memoria=azul, atención=verde, precisión=rosa, tipeo=cian), radios generosos (rounded-2xl), sombras suaves.
- **Tipografía**: Nunito (display y cuerpo alumno), Inter (staff). Escala alumno: base 18 px, botones 20 px+.
- **Táctil**: targets ≥ 48 px; `touch-action: manipulation` (elimina el delay de doble-tap — crítico para reaction time); sin dependencias de hover.
- **Daltonismo**: color nunca como único canal (forma + texto + ícono); paleta chequeada contra deuteranopia/protanopia; tema de alto contraste.
- **Animación** (Framer Motion): transiciones cortas (<300 ms) en navegación; celebraciones ricas solo en resultados; `prefers-reduced-motion` degrada a fades.
- **Charts** (Recharts sobre wrappers propios): misma paleta tokenizada, tooltips grandes, ejes legibles; en vista alumno los gráficos son simplificados (línea de evolución + estrella en el récord).
- **Responsive**: mobile-first; breakpoints tablet (768) y notebook (1024); los juegos usan viewport completo con safe-areas.

## 4. Rendimiento

- Juegos = client components con `dynamic(import)` por slug — el hub no carga los 8 juegos.
- SSR/streaming para staff dashboards; vistas alumno mayormente client-side tras el shell (App Shell + prefetch del hub).
- TanStack Query: `staleTime` agresivo en catálogo/perfil, invalidación quirúrgica post-`complete` (solo summary, stats del benchmark jugado y leaderboard visible).
- Presupuesto: LCP < 2 s en tablet gama baja; bundle inicial alumno < 200 KB gz.
- PWA (fase 3): service worker para cache de shell y juegos → arranque instantáneo en tablets del aula; el outbox ya da tolerancia offline para envío de resultados.

## 5. Testing frontend

- Vitest + Testing Library: GameShell (pausa/foco/buffer), hooks del motor, componentes de gamificación (dado RewardsSummary → render correcto).
- Las funciones de juego puras (generación de secuencias, validación de input) viven en `packages/benchmarks` y se testean allí sin DOM.
- Playwright (fase 2): flujo completo login alumno → jugar reaction time (con reloj mockeado) → ver resultados.
