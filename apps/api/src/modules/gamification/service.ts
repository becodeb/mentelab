import type { Prisma } from "@mentelab/db";
import {
  computeAttemptXp,
  consistency,
  dailyMissionsFor,
  encouragementFor,
  evaluateBadges,
  getBenchmark,
  levelFromTotalXp,
  mean,
  missionProgressForAttempt,
  missionProgressMode,
  pickSituation,
  type BadgeContext,
  type XpGrant,
} from "@mentelab/benchmarks";
import type { RewardsSummary } from "@mentelab/shared";

type Tx = Prisma.TransactionClient;

/** Fecha local (solo día) como Date UTC-medianoche, para columnas @db.Date. */
function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function isoDay(d: Date): string {
  return dateOnly(d).toISOString().slice(0, 10);
}

export interface RewardArgs {
  playerId: string;
  attemptId: string;
  benchmarkSlug: string;
  score: number;
  durationMs: number;
  focusLostCount: number;
  now: Date;
}

/**
 * Procesa TODAS las recompensas de un intento completado, en la misma
 * transacción que lo persiste (doc 05 §6): racha, récords, XP, misiones,
 * insignias y frase de aliento. Devuelve el RewardsSummary para la
 * pantalla de resultados.
 */
export async function processAttemptRewards(tx: Tx, args: RewardArgs): Promise<RewardsSummary> {
  const def = getBenchmark(args.benchmarkSlug);
  const higherBetter = def.scoreDirection === "higher_better";
  const today = dateOnly(args.now);
  const dayStart = new Date(args.now.getFullYear(), args.now.getMonth(), args.now.getDate());

  const progress =
    (await tx.playerProgress.findUnique({ where: { playerId: args.playerId } })) ??
    (await tx.playerProgress.create({ data: { playerId: args.playerId } }));

  const stats = await tx.playerBenchmarkStats.findUnique({
    where: { playerId_benchmarkSlug: { playerId: args.playerId, benchmarkSlug: args.benchmarkSlug } },
  });

  // ── Contexto del día ─────────────────────────────────────────────
  const todayAttempts = await tx.attempt.findMany({
    where: { playerId: args.playerId, status: "COMPLETED", startedAt: { gte: dayStart } },
    select: { benchmarkSlug: true },
  });
  const attemptsToday = todayAttempts.length; // incluye el actual (ya COMPLETED)
  const attemptsOfBenchmarkToday = todayAttempts.filter(
    (a) => a.benchmarkSlug === args.benchmarkSlug,
  ).length;
  const distinctBenchmarksToday = new Set(todayAttempts.map((a) => a.benchmarkSlug)).size;

  const previous = await tx.attempt.findFirst({
    where: { playerId: args.playerId, status: "COMPLETED", id: { not: args.attemptId } },
    orderBy: { startedAt: "desc" },
    select: { benchmarkSlug: true },
  });

  // ── Racha (con protector: 1 día de gracia por semana) ────────────
  const last = progress.lastPlayedDate ? dateOnly(progress.lastPlayedDate) : null;
  const gapDays = last ? Math.round((today.getTime() - last.getTime()) / 86_400_000) : null;
  const daysSinceLastPlayed = gapDays;
  let newStreak = progress.currentStreak;
  let streakExtended = false;
  let graceUsedOn = progress.graceUsedOn;
  const isFirstOfDay = gapDays === null || gapDays >= 1;
  if (gapDays === null) {
    newStreak = 1;
    streakExtended = true;
  } else if (gapDays === 1) {
    newStreak = progress.currentStreak + 1;
    streakExtended = true;
  } else if (gapDays === 2) {
    const graceAvailable =
      !progress.graceUsedOn ||
      today.getTime() - dateOnly(progress.graceUsedOn).getTime() >= 7 * 86_400_000;
    if (graceAvailable) {
      newStreak = progress.currentStreak + 1;
      graceUsedOn = today;
    } else {
      newStreak = 1;
    }
    streakExtended = true;
  } else if (gapDays >= 3) {
    newStreak = 1;
    streakExtended = true;
  }

  // ── Récord personal y mejora contra uno mismo ────────────────────
  const prevBest = stats?.bestScore ?? null;
  const isPersonalRecord =
    prevBest !== null && (higherBetter ? args.score > prevBest : args.score < prevBest);
  const isBaseline = prevBest === null;
  const beatOwnAvg30d =
    stats?.avg30d != null &&
    (higherBetter ? args.score > stats.avg30d : args.score < stats.avg30d);
  const nearRecord =
    !isPersonalRecord &&
    prevBest !== null &&
    prevBest !== 0 &&
    Math.abs(args.score - prevBest) / Math.abs(prevBest) <= 0.05;

  // ── XP del intento ───────────────────────────────────────────────
  const streakMilestone = [3, 7, 14, 30].includes(newStreak) && streakExtended ? newStreak : null;
  const grants: XpGrant[] = computeAttemptXp({
    isFirstOfDay,
    isDifferentFromPrevious: previous !== null && previous.benchmarkSlug !== args.benchmarkSlug,
    beatOwnAvg30d,
    isPersonalRecord,
    attemptsOfBenchmarkToday,
    streakReachedToday: streakMilestone,
  });

  // ── Misiones diarias ─────────────────────────────────────────────
  const missionsAdvanced: RewardsSummary["missionsAdvanced"] = [];
  const missionDefs = dailyMissionsFor(args.playerId, isoDay(args.now));
  for (const mission of missionDefs) {
    const existing = await tx.playerMission.upsert({
      where: {
        playerId_missionCode_date: {
          playerId: args.playerId,
          missionCode: mission.code,
          date: today,
        },
      },
      create: {
        playerId: args.playerId,
        missionCode: mission.code,
        date: today,
        target: mission.target,
        xpReward: mission.xpReward,
      },
      update: {},
    });
    if (existing.completedAt) continue;
    const delta = missionProgressForAttempt(mission, {
      benchmarkSlug: args.benchmarkSlug,
      beatOwnAvg: beatOwnAvg30d,
      focusLostCount: args.focusLostCount,
      distinctBenchmarksToday,
    });
    const newProgress =
      missionProgressMode(mission.kind) === "set"
        ? Math.max(existing.progress, delta)
        : existing.progress + delta;
    if (newProgress === existing.progress) continue;
    const capped = Math.min(newProgress, mission.target);
    const completed = capped >= mission.target;
    await tx.playerMission.update({
      where: { id: existing.id },
      data: { progress: capped, completedAt: completed ? args.now : null },
    });
    if (completed) grants.push({ reason: `mission:${mission.code}`, amount: mission.xpReward });
    missionsAdvanced.push({
      code: mission.code,
      title: mission.title,
      progress: capped,
      target: mission.target,
      completed,
    });
  }

  // ── Actualizar agregados del benchmark ───────────────────────────
  const totalAttempts = (stats?.totalAttempts ?? 0) + 1;
  const newAvgAllTime =
    stats?.avgAllTime != null
      ? (stats.avgAllTime * stats.totalAttempts + args.score) / totalAttempts
      : args.score;

  const since30 = new Date(args.now.getTime() - 30 * 86_400_000);
  const recent = await tx.attempt.findMany({
    where: {
      playerId: args.playerId,
      benchmarkSlug: args.benchmarkSlug,
      status: "COMPLETED",
      startedAt: { gte: since30 },
      score: { not: null },
    },
    orderBy: { startedAt: "asc" },
    select: { score: true },
    take: 300,
  });
  const recentScores = recent.map((a) => a.score!).filter((s) => Number.isFinite(s));
  const avg30d = recentScores.length ? mean(recentScores) : args.score;
  const consistency30d = recentScores.length >= 5 ? consistency(recentScores) : null;
  // Mejora 30d: primera mitad vs segunda mitad, con signo según dirección.
  let improvement30dPct: number | null = null;
  if (recentScores.length >= 6) {
    const half = Math.floor(recentScores.length / 2);
    const firstAvg = mean(recentScores.slice(0, half));
    const secondAvg = mean(recentScores.slice(half));
    if (firstAvg !== 0) {
      const rawPct = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
      improvement30dPct = Math.round((higherBetter ? rawPct : -rawPct) * 10) / 10;
    }
  }

  const newBest = isBaseline || isPersonalRecord ? args.score : prevBest;
  await tx.playerBenchmarkStats.upsert({
    where: { playerId_benchmarkSlug: { playerId: args.playerId, benchmarkSlug: args.benchmarkSlug } },
    create: {
      playerId: args.playerId,
      benchmarkSlug: args.benchmarkSlug,
      totalAttempts: 1,
      totalPlayMs: args.durationMs,
      bestScore: args.score,
      bestAt: args.now,
      avgAllTime: args.score,
      avg30d,
      consistency30d,
      improvement30dPct,
      lastPlayedAt: args.now,
    },
    update: {
      totalAttempts,
      totalPlayMs: { increment: args.durationMs },
      bestScore: newBest,
      ...(isBaseline || isPersonalRecord ? { bestAt: args.now } : {}),
      avgAllTime: Math.round(newAvgAllTime * 100) / 100,
      avg30d: Math.round(avg30d * 100) / 100,
      consistency30d,
      improvement30dPct,
      lastPlayedAt: args.now,
    },
  });

  // Histórico de récords: también la primera marca (baseline, sin celebración).
  if (isBaseline || isPersonalRecord) {
    await tx.personalBest.create({
      data: {
        playerId: args.playerId,
        benchmarkSlug: args.benchmarkSlug,
        value: args.score,
        attemptId: args.attemptId,
      },
    });
  }

  // ── Insignias ────────────────────────────────────────────────────
  const earnedCodes = new Set(
    (
      await tx.playerBadge.findMany({
        where: { playerId: args.playerId },
        select: { badgeCode: true },
      })
    ).map((b) => b.badgeCode),
  );
  const distinctBenchmarksPlayed = await tx.playerBenchmarkStats.count({
    where: { playerId: args.playerId },
  });
  const recordsLast7d = await tx.personalBest.count({
    where: {
      playerId: args.playerId,
      achievedAt: { gte: new Date(args.now.getTime() - 7 * 86_400_000) },
    },
  });
  const badgeCtx: BadgeContext = {
    benchmarkSlug: args.benchmarkSlug,
    score: args.score,
    isPersonalRecord,
    totalAttempts: progress.totalAttempts + 1,
    currentStreak: newStreak,
    distinctBenchmarksPlayed,
    attemptsToday,
    totalPlayMs: progress.totalPlayMs + args.durationMs,
    recordsLast7d,
    daysSinceLastPlayed,
    improvement30dPct,
  };
  const newBadges = evaluateBadges(badgeCtx, earnedCodes);
  for (const badge of newBadges) {
    await tx.playerBadge.create({
      data: { playerId: args.playerId, badgeCode: badge.code, refId: args.attemptId },
    });
    grants.push({ reason: `badge:${badge.code}`, amount: badge.xpReward });
  }

  // ── Ledger de XP y progreso global ───────────────────────────────
  const xpEarned = grants.reduce((a, g) => a + g.amount, 0);
  await tx.xpTransaction.createMany({
    data: grants.map((g) => ({
      playerId: args.playerId,
      amount: g.amount,
      reason: g.reason,
      refId: args.attemptId,
    })),
  });
  const totalXp = progress.xp + xpEarned;
  const prevLevel = levelFromTotalXp(progress.xp).level;
  const lv = levelFromTotalXp(totalXp);
  await tx.playerProgress.update({
    where: { playerId: args.playerId },
    data: {
      xp: totalXp,
      level: lv.level,
      currentStreak: newStreak,
      longestStreak: Math.max(progress.longestStreak, newStreak),
      lastPlayedDate: today,
      graceUsedOn,
      totalAttempts: { increment: 1 },
      totalPlayMs: { increment: args.durationMs },
    },
  });

  // ── Frase de aliento (estable por intento: idempotencia) ─────────
  const situation = pickSituation({ isPersonalRecord, beatOwnAvg30d, nearRecord, daysSinceLastPlayed });
  return {
    xpEarned,
    xpBreakdown: grants,
    totalXp,
    level: lv.level,
    levelUp: lv.level > prevLevel,
    xpIntoLevel: lv.xpIntoLevel,
    xpForNextLevel: lv.xpForNextLevel,
    currentStreak: newStreak,
    streakExtended,
    personalRecord: isPersonalRecord,
    newBadges: newBadges.map((b) => ({
      code: b.code,
      name: b.name,
      emoji: b.emoji,
      description: b.description,
    })),
    missionsAdvanced,
    encouragement: encouragementFor(situation, args.attemptId),
  };
}
