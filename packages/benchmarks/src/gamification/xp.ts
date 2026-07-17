/**
 * Motor de XP. Regla de oro (doc 05): el XP premia el PROCESO
 * (jugar, volver, mejorar contra uno mismo), nunca el resultado absoluto
 * comparado con otros.
 */

export interface XpGrant {
  reason: string;
  amount: number;
}

/** XP necesario para pasar del nivel n al n+1: curva suave y sin techo. */
export function xpForLevelUp(level: number): number {
  return 100 + 40 * (level - 1);
}

/** Nivel y progreso dentro del nivel a partir del XP total acumulado. */
export function levelFromTotalXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevelUp(level)) {
    remaining -= xpForLevelUp(level);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpForLevelUp(level) };
}

export interface AttemptXpContext {
  isFirstOfDay: boolean;
  isDifferentFromPrevious: boolean;
  beatOwnAvg30d: boolean;
  isPersonalRecord: boolean;
  /** Partidas de ESTE benchmark hoy, contando esta (anti-farming). */
  attemptsOfBenchmarkToday: number;
  /** Longitud de racha si se extendió hoy con esta partida, si no null. */
  streakReachedToday: number | null;
}

const STREAK_BONUSES: Record<number, number> = { 3: 15, 7: 30, 14: 60, 30: 120 };

export function computeAttemptXp(ctx: AttemptXpContext): XpGrant[] {
  const grants: XpGrant[] = [];

  // Base por jugar, con rendimiento decreciente para farming del mismo juego.
  const n = ctx.attemptsOfBenchmarkToday;
  const factor = n <= 5 ? 1 : n <= 10 ? 0.5 : 0.1;
  grants.push({ reason: "attempt", amount: Math.max(1, Math.round(10 * factor)) });

  if (ctx.isFirstOfDay) grants.push({ reason: "first_of_day", amount: 10 });
  if (ctx.isDifferentFromPrevious) grants.push({ reason: "variety", amount: 5 });
  if (ctx.beatOwnAvg30d) grants.push({ reason: "beat_own_avg", amount: 10 });
  if (ctx.isPersonalRecord) grants.push({ reason: "personal_record", amount: 25 });

  if (ctx.streakReachedToday !== null) {
    const bonus = STREAK_BONUSES[ctx.streakReachedToday];
    if (bonus) grants.push({ reason: `streak_${ctx.streakReachedToday}`, amount: bonus });
  }
  return grants;
}
