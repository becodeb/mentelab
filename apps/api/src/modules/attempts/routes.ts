import { Router } from "express";
import { z } from "zod";
import { prisma } from "@mentelab/db";
import {
  CompleteAttemptSchema,
  StartAttemptSchema,
  type CompleteAttemptResponse,
  type RewardsSummary,
} from "@mentelab/shared";
import { benchmarkRegistry, getBenchmark } from "@mentelab/benchmarks";
import { asyncHandler, badRequest, forbidden, notFound } from "../../core/errors";
import { validateBody, validateQuery, getQuery } from "../../core/validate";
import { ctxOf, playerOf, requireAuth, requirePlayer } from "../../core/auth";
import { rateLimit } from "../../core/rateLimit";
import {
  buildConfig,
  normalizedScoreFor,
  recomputeMetrics,
  resolvePlayerContext,
  sanitizeEvents,
  validateAttemptQuality,
} from "./service";
import { processAttemptRewards } from "../gamification/service";

export const attemptsRouter: ReturnType<typeof Router> = Router();

/** Recompensas vacías para reintentos idempotentes e intentos inválidos. */
function emptyRewards(message: string): RewardsSummary {
  return {
    xpEarned: 0,
    xpBreakdown: [],
    totalXp: 0,
    level: 1,
    levelUp: false,
    xpIntoLevel: 0,
    xpForNextLevel: 100,
    currentStreak: 0,
    streakExtended: false,
    personalRecord: false,
    newBadges: [],
    missionsAdvanced: [],
    encouragement: message,
  };
}

attemptsRouter.post(
  "/start",
  requirePlayer(),
  rateLimit({
    windowSec: 60,
    max: 30,
    keyFn: (req) => {
      const principal = ctxOf(req).principal;
      return principal.kind === "staff" ? "staff" : principal.playerId;
    },
  }),
  validateBody(StartAttemptSchema),
  asyncHandler(async (req, res) => {
    const player = playerOf(req);
    const { benchmarkSlug } = req.body;
    if (!benchmarkRegistry.has(benchmarkSlug)) throw badRequest("Benchmark desconocido");

    const gameCtx = await resolvePlayerContext(player.playerId);
    const config = await buildConfig(player.playerId, benchmarkSlug, gameCtx.playerAge);

    const attempt = await prisma.attempt.create({
      data: {
        playerId: player.playerId,
        benchmarkSlug,
        scope: gameCtx.scope,
        institutionId: gameCtx.institutionId,
        classroomId: gameCtx.classroomId,
        gradeLevel: gameCtx.gradeLevel,
        playerAge: gameCtx.playerAge,
        status: "IN_PROGRESS",
        config: config as object,
      },
    });
    res.json({ attemptId: attempt.id, config });
  }),
);

attemptsRouter.post(
  "/:id/complete",
  requirePlayer(),
  validateBody(CompleteAttemptSchema),
  asyncHandler(async (req, res) => {
    const player = playerOf(req);
    const attemptId = String(req.params["id"]);
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.playerId !== player.playerId) throw notFound("Intento no encontrado");

    // Idempotencia: reintento del outbox tras un corte de red.
    if (attempt.status !== "IN_PROGRESS") {
      const response: CompleteAttemptResponse = {
        attemptId,
        status: attempt.status,
        score: attempt.score ?? 0,
        scoreNormalized: attempt.scoreNormalized,
        metrics: (attempt.metrics as Record<string, unknown>) ?? {},
        rewards: emptyRewards("¡Partida ya registrada!"),
        classroomRank: null,
      };
      res.json(response);
      return;
    }

    const body = req.body;
    const events = sanitizeEvents(attempt.benchmarkSlug, body.events);
    const { metrics, score, summary } = recomputeMetrics(
      attempt.benchmarkSlug,
      events,
      attempt.config,
    );
    const invalidReason = validateAttemptQuality(attempt.benchmarkSlug, events, metrics);
    const status = invalidReason ? "INVALID" : "COMPLETED";
    const now = new Date();
    const scoreNormalized = invalidReason
      ? null
      : normalizedScoreFor(attempt.benchmarkSlug, score, attempt.playerAge);

    const { rewards } = await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          status,
          endedAt: now,
          durationMs: body.durationMs,
          score,
          scoreNormalized,
          levelReached: summary.levelReached,
          errorCount: summary.errorCount,
          successCount: summary.successCount,
          metrics: metrics as object,
          focusLostCount: body.focusLostCount,
          pauseCount: body.pauseCount,
          avgFps: body.avgFps ?? null,
          device: (body.device as object | undefined) ?? undefined,
          appVersion: body.appVersion ?? null,
          invalidReason,
        },
      });
      if (events.length > 0) {
        await tx.attemptEvent.createMany({
          data: events.map((e) => ({
            attemptId,
            seq: e.seq,
            tMs: e.tMs,
            type: e.type,
            payload: (e.payload as object | undefined) ?? undefined,
          })),
        });
      }
      if (status === "INVALID") {
        return {
          rewards: emptyRewards("Partida guardada. ¡La próxima jugála completa y sin ayuda! 🙂"),
        };
      }
      const rewards = await processAttemptRewards(tx, {
        playerId: player.playerId,
        attemptId,
        benchmarkSlug: attempt.benchmarkSlug,
        score,
        durationMs: body.durationMs,
        focusLostCount: body.focusLostCount,
        now,
      });
      return { rewards };
    });

    // Posición en el curso (solo alumnos, solo si la institución lo permite).
    let classroomRank: number | null = null;
    if (player.kind === "student" && attempt.classroomId && status === "COMPLETED") {
      const inst = await prisma.institution.findUnique({
        where: { id: attempt.institutionId! },
        select: { settings: true },
      });
      const settings = (inst?.settings ?? {}) as { studentRankingsVisible?: boolean };
      if (settings.studentRankingsVisible !== false) {
        classroomRank = await computeClassroomRank(
          attempt.classroomId,
          attempt.benchmarkSlug,
          player.playerId,
        );
      }
    }

    const response: CompleteAttemptResponse = {
      attemptId,
      status,
      score,
      scoreNormalized,
      metrics: metrics as Record<string, unknown>,
      rewards,
      classroomRank,
    };
    res.json(response);
  }),
);

/** Mejor marca de 30 días por jugador del curso → posición del jugador. */
async function computeClassroomRank(
  classroomId: string,
  benchmarkSlug: string,
  playerId: string,
): Promise<number | null> {
  const def = getBenchmark(benchmarkSlug);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const grouped = await prisma.attempt.groupBy({
    by: ["playerId"],
    where: { classroomId, benchmarkSlug, status: "COMPLETED", startedAt: { gte: since } },
    _min: { score: true },
    _max: { score: true },
  });
  const entries = grouped
    .map((g) => ({
      playerId: g.playerId,
      value: def.scoreDirection === "lower_better" ? g._min.score : g._max.score,
    }))
    .filter((e): e is { playerId: string; value: number } => e.value != null)
    .sort((a, b) =>
      def.scoreDirection === "lower_better" ? a.value - b.value : b.value - a.value,
    );
  const idx = entries.findIndex((e) => e.playerId === playerId);
  return idx === -1 ? null : idx + 1;
}

attemptsRouter.post(
  "/:id/abandon",
  requirePlayer(),
  validateBody(CompleteAttemptSchema.partial({ durationMs: true })),
  asyncHandler(async (req, res) => {
    const player = playerOf(req);
    const attemptId = String(req.params["id"]);
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.playerId !== player.playerId) throw notFound("Intento no encontrado");
    if (attempt.status !== "IN_PROGRESS") {
      res.json({ ok: true });
      return;
    }
    const events = sanitizeEvents(attempt.benchmarkSlug, req.body.events ?? []);
    await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          status: "ABANDONED",
          endedAt: new Date(),
          durationMs: req.body.durationMs ?? null,
          focusLostCount: req.body.focusLostCount ?? 0,
          pauseCount: req.body.pauseCount ?? 0,
        },
      });
      if (events.length > 0) {
        await tx.attemptEvent.createMany({
          data: events.map((e) => ({
            attemptId,
            seq: e.seq,
            tMs: e.tMs,
            type: e.type,
            payload: (e.payload as object | undefined) ?? undefined,
          })),
        });
      }
    });
    res.json({ ok: true });
  }),
);

const ListQuery = z.object({
  playerId: z.string().uuid().optional(),
  benchmark: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

attemptsRouter.get(
  "/",
  requireAuth(),
  validateQuery(ListQuery),
  asyncHandler(async (req, res) => {
    const { principal } = ctxOf(req);
    const q = getQuery<z.infer<typeof ListQuery>>(req);

    // Alumnos/invitados: solo su propio historial. Staff: su alcance.
    let playerId = q.playerId;
    if (principal.kind !== "staff") {
      playerId = principal.playerId;
    } else if (playerId) {
      const target = await prisma.studentProfile.findUnique({ where: { playerId } });
      if (!target) throw notFound("Alumno no encontrado");
      if (principal.role !== "SUPER_ADMIN" && target.institutionId !== principal.institutionId)
        throw forbidden();
    } else {
      throw badRequest("playerId requerido para staff");
    }

    const attempts = await prisma.attempt.findMany({
      where: {
        playerId,
        ...(q.benchmark ? { benchmarkSlug: q.benchmark } : {}),
        ...(q.from || q.to ? { startedAt: { gte: q.from, lte: q.to } } : {}),
        status: { in: ["COMPLETED", "INVALID", "ABANDONED"] },
      },
      orderBy: { startedAt: "desc" },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const hasMore = attempts.length > q.limit;
    const page = hasMore ? attempts.slice(0, q.limit) : attempts;
    res.json({
      attempts: page.map((a) => ({
        id: a.id,
        benchmarkSlug: a.benchmarkSlug,
        status: a.status,
        startedAt: a.startedAt.toISOString(),
        durationMs: a.durationMs,
        score: a.score,
        scoreNormalized: a.scoreNormalized,
        levelReached: a.levelReached,
        errorCount: a.errorCount,
        successCount: a.successCount,
        metrics: a.metrics,
        focusLostCount: a.focusLostCount,
        avgFps: a.avgFps,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  }),
);

attemptsRouter.get(
  "/:id",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { principal } = ctxOf(req);
    const includeEvents = req.query["includeEvents"] === "true";
    const attempt = await prisma.attempt.findUnique({
      where: { id: String(req.params["id"]) },
      include: includeEvents ? { events: { orderBy: { seq: "asc" } } } : undefined,
    });
    if (!attempt) throw notFound("Intento no encontrado");
    if (principal.kind !== "staff") {
      if (attempt.playerId !== principal.playerId) throw forbidden();
    } else if (
      principal.role !== "SUPER_ADMIN" &&
      attempt.institutionId !== principal.institutionId
    ) {
      throw forbidden();
    }
    res.json({ attempt });
  }),
);
