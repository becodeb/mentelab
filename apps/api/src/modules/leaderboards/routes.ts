import { Router } from "express";
import { prisma } from "@mentelab/db";
import {
  LeaderboardQuerySchema,
  type LeaderboardEntry,
  type LeaderboardQuery,
  type LeaderboardResponse,
} from "@mentelab/shared";
import { consistency, getBenchmark, mean } from "@mentelab/benchmarks";
import { asyncHandler, badRequest, forbidden } from "../../core/errors";
import { validateQuery, getQuery } from "../../core/validate";
import { ctxOf, requireAuth } from "../../core/auth";
import { cacheGet, cacheSet } from "../../core/redis";

export const leaderboardsRouter: ReturnType<typeof Router> = Router();

/** Mínimo de intentos para rankear por métrica (doc 06 §4). */
const MIN_ATTEMPTS: Record<LeaderboardQuery["metric"], number> = {
  best: 1,
  avg: 3,
  count: 1,
  consistency: 5,
  progress: 5,
};

function periodStart(period: LeaderboardQuery["period"]): Date | null {
  const now = Date.now();
  switch (period) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d":
      return new Date(now - 7 * 86_400_000);
    case "30d":
      return new Date(now - 30 * 86_400_000);
    case "year":
      return new Date(new Date().getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

interface RawEntry {
  playerId: string;
  value: number;
}

/**
 * Calcula el ranking desde SQL (fuente de verdad). El resultado se cachea
 * en Redis 60 s; si Redis no está, la query directa sigue siendo válida.
 */
async function computeEntries(
  q: LeaderboardQuery,
  where: Record<string, unknown>,
): Promise<RawEntry[]> {
  const def = getBenchmark(q.benchmark);
  const lower = def.scoreDirection === "lower_better";
  const min = MIN_ATTEMPTS[q.metric];

  if (q.metric === "best" || q.metric === "avg" || q.metric === "count") {
    const grouped = await prisma.attempt.groupBy({
      by: ["playerId"],
      where,
      _min: { score: true },
      _max: { score: true },
      _avg: { score: true },
      _count: { _all: true },
    });
    return grouped
      .filter((g) => g._count._all >= min)
      .map((g) => ({
        playerId: g.playerId,
        value:
          q.metric === "count"
            ? g._count._all
            : q.metric === "avg"
              ? Math.round((g._avg.score ?? 0) * 10) / 10
              : ((lower ? g._min.score : g._max.score) ?? 0),
      }))
      .filter((e) => Number.isFinite(e.value));
  }

  // consistency / progress: necesitan la serie por jugador.
  const rows = await prisma.attempt.findMany({
    where,
    select: { playerId: true, score: true, startedAt: true },
    orderBy: { startedAt: "asc" },
    take: 20_000,
  });
  const byPlayer = new Map<string, number[]>();
  for (const r of rows) {
    if (r.score == null) continue;
    const arr = byPlayer.get(r.playerId) ?? [];
    arr.push(r.score);
    byPlayer.set(r.playerId, arr);
  }
  const entries: RawEntry[] = [];
  for (const [playerId, scores] of byPlayer) {
    if (scores.length < min) continue;
    if (q.metric === "consistency") {
      entries.push({ playerId, value: Math.round(consistency(scores) * 1000) / 10 });
    } else {
      // progress: % de mejora primera mitad vs segunda (direccional).
      const half = Math.floor(scores.length / 2);
      const first = mean(scores.slice(0, half));
      const second = mean(scores.slice(half));
      if (first === 0) continue;
      const raw = ((second - first) / Math.abs(first)) * 100;
      entries.push({ playerId, value: Math.round((lower ? -raw : raw) * 10) / 10 });
    }
  }
  return entries;
}

leaderboardsRouter.get(
  "/",
  requireAuth(),
  validateQuery(LeaderboardQuerySchema),
  asyncHandler(async (req, res) => {
    const { principal } = ctxOf(req);
    const q = getQuery<LeaderboardQuery>(req);
    const def = getBenchmark(q.benchmark);
    const lower = def.scoreDirection === "lower_better";

    // ── Autorización + armado del filtro (separación estructural) ──
    const where: Record<string, unknown> = {
      benchmarkSlug: q.benchmark,
      status: "COMPLETED",
    };
    const from = periodStart(q.period);
    if (from) where["startedAt"] = { gte: from };

    let myPlayerId: string | null = null;
    if (principal.kind === "student") myPlayerId = principal.playerId;
    if (principal.kind === "guest") myPlayerId = principal.playerId;

    if (q.scope === "global") {
      // Modo Libre: SOLO datos GLOBAL. Staff institucional no lo consulta.
      if (principal.kind === "student") throw forbidden("Ranking global no disponible");
      where["scope"] = "GLOBAL";
    } else {
      where["scope"] = "INSTITUTIONAL";
      const myInstitution =
        principal.kind === "student"
          ? principal.institutionId
          : principal.kind === "staff"
            ? principal.institutionId
            : null;
      if (!myInstitution && principal.kind !== "staff") throw forbidden();

      switch (q.scope) {
        case "classroom": {
          const classroomId = q.scopeId ?? (principal.kind === "student" ? principal.classroomId : undefined);
          if (!classroomId) throw badRequest("scopeId requerido");
          const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
          if (!classroom) throw badRequest("Curso inexistente");
          if (
            principal.kind !== "staff" || principal.role !== "SUPER_ADMIN"
              ? classroom.institutionId !== myInstitution
              : false
          )
            throw forbidden();
          where["classroomId"] = classroomId;
          break;
        }
        case "grade": {
          if (!q.scopeId) throw badRequest("scopeId (gradeId) requerido");
          const grade = await prisma.grade.findUnique({ where: { id: q.scopeId } });
          if (!grade) throw badRequest("Grado inexistente");
          if (myInstitution && grade.institutionId !== myInstitution) throw forbidden();
          where["institutionId"] = grade.institutionId;
          where["gradeLevel"] = grade.level;
          break;
        }
        case "age": {
          if (!q.ageValue) throw badRequest("ageValue requerido");
          if (!myInstitution) throw forbidden();
          where["institutionId"] = myInstitution;
          where["playerAge"] = q.ageValue;
          break;
        }
        case "institution": {
          const instId = q.scopeId ?? myInstitution;
          if (!instId) throw badRequest("scopeId requerido");
          if (
            myInstitution &&
            instId !== myInstitution &&
            !(principal.kind === "staff" && principal.role === "SUPER_ADMIN")
          )
            throw forbidden();
          where["institutionId"] = instId;
          break;
        }
      }
    }

    // ── Cálculo (con caché) ─────────────────────────────────────────
    const cacheKey = `lb:${JSON.stringify({ ...q, where })}`;
    let entries = await cacheGet<RawEntry[]>(cacheKey);
    if (!entries) {
      entries = await computeEntries(q, where);
      await cacheSet(cacheKey, entries, 60);
    }

    // Orden: best/avg respetan la dirección del benchmark; el resto desc.
    const asc = (q.metric === "best" || q.metric === "avg") && lower;
    entries.sort((a, b) => (asc ? a.value - b.value : b.value - a.value));

    // Ranking global: solo invitados con alias (opt-in, doc 06 §4).
    if (q.scope === "global") {
      const aliased = await prisma.guestProfile.findMany({
        where: { playerId: { in: entries.map((e) => e.playerId) }, alias: { not: null } },
        select: { playerId: true },
      });
      const ok = new Set(aliased.map((a) => a.playerId));
      if (myPlayerId) ok.add(myPlayerId); // el propio jugador siempre se ve
      entries = entries.filter((e) => ok.has(e.playerId));
    }

    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }));
    const myIdx = myPlayerId ? ranked.findIndex((e) => e.playerId === myPlayerId) : -1;

    // around=me: top 3 + vecindario (anti-frustración, doc 05 §5.1).
    let visible = ranked.slice(0, q.limit);
    if (q.around === "me" && myIdx >= 0) {
      const top = ranked.slice(0, 3);
      const around = ranked.slice(Math.max(3, myIdx - 2), myIdx + 3);
      const seen = new Set<string>();
      visible = [...top, ...around].filter((e) =>
        seen.has(e.playerId) ? false : (seen.add(e.playerId), true),
      );
    }

    const players = await prisma.player.findMany({
      where: { id: { in: visible.map((e) => e.playerId) } },
      select: { id: true, displayName: true, avatarId: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const toEntry = (e: (typeof ranked)[number]): LeaderboardEntry => ({
      rank: e.rank,
      playerId: e.playerId,
      displayName: playerMap.get(e.playerId)?.displayName ?? "—",
      avatarId: playerMap.get(e.playerId)?.avatarId ?? "fox",
      value: e.value,
      isMe: e.playerId === myPlayerId,
    });

    let myEntry: LeaderboardEntry | null = null;
    if (myIdx >= 0) {
      const me = ranked[myIdx]!;
      const p = playerMap.get(me.playerId) ??
        (await prisma.player.findUnique({
          where: { id: me.playerId },
          select: { id: true, displayName: true, avatarId: true },
        }));
      myEntry = {
        rank: me.rank,
        playerId: me.playerId,
        displayName: p?.displayName ?? "—",
        avatarId: p?.avatarId ?? "fox",
        value: me.value,
        isMe: true,
      };
    }

    const response: LeaderboardResponse = {
      entries: visible.map(toEntry),
      myEntry,
      totalPlayers: ranked.length,
      metric: q.metric,
      scoreDirection: def.scoreDirection,
      unit: q.metric === "count" ? "partidas" : q.metric === "progress" ? "%" : q.metric === "consistency" ? "%" : def.unit,
    };
    res.json(response);
  }),
);
