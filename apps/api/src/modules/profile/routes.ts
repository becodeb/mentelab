import { Router } from "express";
import { prisma } from "@mentelab/db";
import {
  BADGE_CATALOG,
  benchmarkRegistry,
  dailyMissionsFor,
  getBenchmark,
  levelFromTotalXp,
} from "@mentelab/benchmarks";
import type { BenchmarkStats, MeSummary, PlayerBadge } from "@mentelab/shared";
import { asyncHandler, notFound } from "../../core/errors";
import { playerOf, requirePlayer } from "../../core/auth";
import { computeCognitiveProfile } from "./cognitive";

export const profileRouter: ReturnType<typeof Router> = Router();

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

/**
 * Ranking por benchmark dentro del curso (mejor marca, 30 días) en UNA sola
 * query: alimenta el "Vas 3º de 12" de cada card del hub (motivación entre
 * compañeros sin ser agresivo: siempre junto al récord propio).
 */
async function classroomRanksFor(
  classroomId: string,
  playerId: string,
): Promise<Map<string, { rank: number; total: number }>> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const grouped = await prisma.attempt.groupBy({
    by: ["playerId", "benchmarkSlug"],
    where: { classroomId, status: "COMPLETED", startedAt: { gte: since } },
    _min: { score: true },
    _max: { score: true },
  });
  const bySlug = new Map<string, { playerId: string; value: number }[]>();
  for (const g of grouped) {
    const def = benchmarkRegistry.get(g.benchmarkSlug);
    if (!def) continue;
    const value = def.scoreDirection === "lower_better" ? g._min.score : g._max.score;
    if (value == null) continue;
    const arr = bySlug.get(g.benchmarkSlug) ?? [];
    arr.push({ playerId: g.playerId, value });
    bySlug.set(g.benchmarkSlug, arr);
  }
  const result = new Map<string, { rank: number; total: number }>();
  for (const [slug, entries] of bySlug) {
    const def = benchmarkRegistry.get(slug)!;
    entries.sort((a, b) =>
      def.scoreDirection === "lower_better" ? a.value - b.value : b.value - a.value,
    );
    const idx = entries.findIndex((e) => e.playerId === playerId);
    if (idx !== -1) result.set(slug, { rank: idx + 1, total: entries.length });
  }
  return result;
}

profileRouter.get(
  "/summary",
  requirePlayer(),
  asyncHandler(async (req, res) => {
    const me = playerOf(req);
    const player = await prisma.player.findUnique({
      where: { id: me.playerId },
      include: { progress: true, stats: true, _count: { select: { badges: true } } },
    });
    if (!player) throw notFound();
    const progress = player.progress;
    const lv = levelFromTotalXp(progress?.xp ?? 0);
    const ranks =
      me.kind === "student"
        ? await classroomRanksFor(me.classroomId, me.playerId)
        : new Map<string, { rank: number; total: number }>();

    // Misiones del día: definiciones determinísticas + progreso persistido.
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const missionDefs = dailyMissionsFor(me.playerId, isoDay(now));
    const rows = await prisma.playerMission.findMany({
      where: { playerId: me.playerId, date: today },
    });
    const rowByCode = new Map(rows.map((r) => [r.missionCode, r]));

    const summary: MeSummary = {
      playerId: player.id,
      displayName: player.displayName,
      avatarId: player.avatarId,
      isGuest: player.type === "GUEST",
      xp: progress?.xp ?? 0,
      level: lv.level,
      xpIntoLevel: lv.xpIntoLevel,
      xpForNextLevel: lv.xpForNextLevel,
      currentStreak: progress?.currentStreak ?? 0,
      longestStreak: progress?.longestStreak ?? 0,
      totalAttempts: progress?.totalAttempts ?? 0,
      totalPlayMs: progress?.totalPlayMs ?? 0,
      badgeCount: player._count.badges,
      missions: missionDefs.map((m) => {
        const row = rowByCode.get(m.code);
        return {
          code: m.code,
          title: m.title,
          emoji: m.emoji,
          progress: row?.progress ?? 0,
          target: m.target,
          completed: row?.completedAt != null,
          xpReward: m.xpReward,
        };
      }),
      perBenchmark: player.stats.map((s) => ({
        benchmarkSlug: s.benchmarkSlug,
        totalAttempts: s.totalAttempts,
        bestScore: s.bestScore,
        lastPlayedAt: s.lastPlayedAt?.toISOString() ?? null,
        classroomRank: ranks.get(s.benchmarkSlug)?.rank ?? null,
        classroomTotal: ranks.get(s.benchmarkSlug)?.total ?? null,
      })),
    };
    res.json(summary);
  }),
);

profileRouter.get(
  "/stats/:benchmarkSlug",
  requirePlayer(),
  asyncHandler(async (req, res) => {
    const me = playerOf(req);
    const slug = String(req.params["benchmarkSlug"]);
    const def = getBenchmark(slug);
    const stats = await prisma.playerBenchmarkStats.findUnique({
      where: { playerId_benchmarkSlug: { playerId: me.playerId, benchmarkSlug: slug } },
    });
    const attempts = await prisma.attempt.findMany({
      where: { playerId: me.playerId, benchmarkSlug: slug, status: "COMPLETED" },
      orderBy: { startedAt: "asc" },
      select: { id: true, startedAt: true, score: true },
      take: 200,
    });

    // Marca qué intentos fueron récord en su momento.
    let runningBest: number | null = null;
    const lower = def.scoreDirection === "lower_better";
    const history = attempts
      .filter((a) => a.score != null)
      .map((a) => {
        const isRecord =
          runningBest === null || (lower ? a.score! < runningBest : a.score! > runningBest);
        if (isRecord) runningBest = a.score!;
        return {
          attemptId: a.id,
          at: a.startedAt.toISOString(),
          score: a.score!,
          isRecord,
        };
      });

    // Posición actual en el curso (si es alumno).
    let currentRank: number | null = null;
    let totalInRank: number | null = null;
    if (me.kind === "student") {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const grouped = await prisma.attempt.groupBy({
        by: ["playerId"],
        where: {
          classroomId: me.classroomId,
          benchmarkSlug: slug,
          status: "COMPLETED",
          startedAt: { gte: since },
        },
        _min: { score: true },
        _max: { score: true },
      });
      const entries = grouped
        .map((g) => ({ playerId: g.playerId, value: lower ? g._min.score : g._max.score }))
        .filter((e): e is { playerId: string; value: number } => e.value != null)
        .sort((a, b) => (lower ? a.value - b.value : b.value - a.value));
      const idx = entries.findIndex((e) => e.playerId === me.playerId);
      currentRank = idx === -1 ? null : idx + 1;
      totalInRank = entries.length;
    }

    const response: BenchmarkStats = {
      benchmarkSlug: slug,
      totalAttempts: stats?.totalAttempts ?? 0,
      totalPlayMs: stats?.totalPlayMs ?? 0,
      bestScore: stats?.bestScore ?? null,
      bestAt: stats?.bestAt?.toISOString() ?? null,
      avgAllTime: stats?.avgAllTime ?? null,
      avg30d: stats?.avg30d ?? null,
      improvement30dPct: stats?.improvement30dPct ?? null,
      consistency30d: stats?.consistency30d ?? null,
      currentRank,
      totalInRank,
      history,
    };
    res.json(response);
  }),
);

profileRouter.get(
  "/cognitive-profile",
  requirePlayer(),
  asyncHandler(async (req, res) => {
    const me = playerOf(req);
    res.json(await computeCognitiveProfile(me.playerId));
  }),
);

profileRouter.get(
  "/badges",
  requirePlayer(),
  asyncHandler(async (req, res) => {
    const me = playerOf(req);
    const earned = await prisma.playerBadge.findMany({ where: { playerId: me.playerId } });
    const earnedMap = new Map(earned.map((b) => [b.badgeCode, b.earnedAt]));
    const badges: PlayerBadge[] = BADGE_CATALOG.map((b) => ({
      code: b.code,
      name: b.name,
      emoji: b.emoji,
      description: b.description,
      family: b.family,
      earnedAt: earnedMap.get(b.code)?.toISOString() ?? null,
    }));
    res.json({ badges });
  }),
);
