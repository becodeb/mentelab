import { BENCHMARK_SLUGS, benchmarkRegistry } from "../registry";

export type BadgeFamily = "constancy" | "effort" | "improvement" | "mastery";

/** Contexto evaluado tras cada intento completado. Lo arma la API con agregados. */
export interface BadgeContext {
  benchmarkSlug: string;
  score: number;
  isPersonalRecord: boolean;
  totalAttempts: number;
  currentStreak: number;
  distinctBenchmarksPlayed: number;
  attemptsToday: number;
  totalPlayMs: number;
  recordsLast7d: number;
  /** Días sin jugar ANTES de este intento (para "volviste"). */
  daysSinceLastPlayed: number | null;
  improvement30dPct: number | null;
}

export interface BadgeDef {
  code: string;
  name: string;
  emoji: string;
  description: string;
  family: BadgeFamily;
  xpReward: number;
  check(ctx: BadgeContext): boolean;
}

const base: BadgeDef[] = [
  // ── Constancia 🔥 ──────────────────────────────────────────────
  {
    code: "streak-3",
    name: "Encendido",
    emoji: "🔥",
    description: "Jugaste 3 días seguidos",
    family: "constancy",
    xpReward: 15,
    check: (c) => c.currentStreak >= 3,
  },
  {
    code: "streak-7",
    name: "Semana completa",
    emoji: "🗓️",
    description: "Jugaste 7 días seguidos",
    family: "constancy",
    xpReward: 30,
    check: (c) => c.currentStreak >= 7,
  },
  {
    code: "streak-14",
    name: "Imparable",
    emoji: "🚄",
    description: "Jugaste 14 días seguidos",
    family: "constancy",
    xpReward: 60,
    check: (c) => c.currentStreak >= 14,
  },
  {
    code: "streak-30",
    name: "Leyenda del hábito",
    emoji: "🏛️",
    description: "Jugaste 30 días seguidos",
    family: "constancy",
    xpReward: 120,
    check: (c) => c.currentStreak >= 30,
  },
  {
    code: "comeback",
    name: "¡Volviste!",
    emoji: "🎉",
    description: "Volviste a entrenar después de un descanso largo",
    family: "constancy",
    xpReward: 20,
    check: (c) => c.daysSinceLastPlayed !== null && c.daysSinceLastPlayed >= 14,
  },
  // ── Esfuerzo 💪 ────────────────────────────────────────────────
  {
    code: "attempts-10",
    name: "Calentando motores",
    emoji: "💪",
    description: "Completaste 10 partidas",
    family: "effort",
    xpReward: 10,
    check: (c) => c.totalAttempts >= 10,
  },
  {
    code: "attempts-50",
    name: "Entrenamiento serio",
    emoji: "🏋️",
    description: "Completaste 50 partidas",
    family: "effort",
    xpReward: 25,
    check: (c) => c.totalAttempts >= 50,
  },
  {
    code: "attempts-100",
    name: "Centenario",
    emoji: "💯",
    description: "Completaste 100 partidas",
    family: "effort",
    xpReward: 50,
    check: (c) => c.totalAttempts >= 100,
  },
  {
    code: "attempts-500",
    name: "Maratonista mental",
    emoji: "🏃",
    description: "Completaste 500 partidas",
    family: "effort",
    xpReward: 150,
    check: (c) => c.totalAttempts >= 500,
  },
  {
    code: "explorer",
    name: "Explorador",
    emoji: "🧭",
    description: "Probaste todos los juegos",
    family: "effort",
    xpReward: 40,
    check: (c) => c.distinctBenchmarksPlayed >= BENCHMARK_SLUGS.length,
  },
  {
    code: "busy-day",
    name: "Día a full",
    emoji: "⚡",
    description: "10 partidas en un mismo día",
    family: "effort",
    xpReward: 20,
    check: (c) => c.attemptsToday >= 10,
  },
  {
    code: "playtime-1h",
    name: "Una hora de cerebro",
    emoji: "⏰",
    description: "Acumulaste 1 hora de entrenamiento",
    family: "effort",
    xpReward: 30,
    check: (c) => c.totalPlayMs >= 3_600_000,
  },
  // ── Mejora 📈 ──────────────────────────────────────────────────
  {
    code: "first-record",
    name: "Primer récord",
    emoji: "🌟",
    description: "Rompiste tu récord personal por primera vez",
    family: "improvement",
    xpReward: 15,
    check: (c) => c.isPersonalRecord,
  },
  {
    code: "records-3-week",
    name: "Racha de récords",
    emoji: "📈",
    description: "3 récords personales en una semana",
    family: "improvement",
    xpReward: 40,
    check: (c) => c.recordsLast7d >= 3,
  },
  {
    code: "improve-20",
    name: "Salto de nivel",
    emoji: "🚀",
    description: "Mejoraste tu promedio más de 20% en un mes",
    family: "improvement",
    xpReward: 60,
    check: (c) => c.improvement30dPct !== null && c.improvement30dPct >= 20,
  },
];

/** Maestría 🏆: bronce/plata/oro por benchmark, generadas desde el registry. */
function masteryBadges(): BadgeDef[] {
  const out: BadgeDef[] = [];
  for (const def of benchmarkRegistry.values()) {
    const tiers = [
      { tier: "bronze", label: "Bronce", emoji: "🥉", threshold: def.masteryLevels.bronze, xp: 20 },
      { tier: "silver", label: "Plata", emoji: "🥈", threshold: def.masteryLevels.silver, xp: 40 },
      { tier: "gold", label: "Oro", emoji: "🥇", threshold: def.masteryLevels.gold, xp: 80 },
    ] as const;
    for (const t of tiers) {
      out.push({
        code: `mastery-${def.slug}-${t.tier}`,
        name: `${def.name} ${t.label}`,
        emoji: t.emoji,
        description:
          def.scoreDirection === "lower_better"
            ? `Lograste ${t.threshold} ${def.unit} o menos en ${def.name}`
            : `Alcanzaste ${t.threshold} ${def.unit} en ${def.name}`,
        family: "mastery",
        xpReward: t.xp,
        check: (c) =>
          c.benchmarkSlug === def.slug &&
          (def.scoreDirection === "lower_better"
            ? c.score <= t.threshold && c.score > 0
            : c.score >= t.threshold),
      });
    }
  }
  return out;
}

export const BADGE_CATALOG: BadgeDef[] = [...base, ...masteryBadges()];

export function getBadge(code: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((b) => b.code === code);
}

/** Evalúa qué insignias NUEVAS corresponde otorgar (excluyendo las ya ganadas). */
export function evaluateBadges(ctx: BadgeContext, alreadyEarned: Set<string>): BadgeDef[] {
  return BADGE_CATALOG.filter((b) => !alreadyEarned.has(b.code) && b.check(ctx));
}
