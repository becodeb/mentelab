import { Router } from "express";
import { z } from "zod";
import { prisma } from "@mentelab/db";
import { asyncHandler, notFound } from "../../core/errors";
import { validateBody } from "../../core/validate";
import { requireStaff, staffOf } from "../../core/auth";
import { redis } from "../../core/redis";
import { assertClassroomAccess } from "../roster/service";
import { env } from "../../env";

export const classSessionsRouter: ReturnType<typeof Router> = Router();

/** Sesiones de clase (QR proyectado): Redis si está, memoria si no. */
const memorySessions = new Map<string, { classroomId: string; startedAt: number }>();
const TTL_SEC = 12 * 3600;

async function saveSession(code: string, classroomId: string) {
  const r = redis();
  const data = { classroomId, startedAt: Date.now() };
  if (r) await r.set(`classsession:${code}`, JSON.stringify(data), "EX", TTL_SEC);
  else memorySessions.set(code, data);
}

async function loadSession(code: string) {
  const r = redis();
  if (r) {
    const raw = await r.get(`classsession:${code}`);
    return raw ? (JSON.parse(raw) as { classroomId: string; startedAt: number }) : null;
  }
  const s = memorySessions.get(code);
  if (s && Date.now() - s.startedAt > TTL_SEC * 1000) {
    memorySessions.delete(code);
    return null;
  }
  return s ?? null;
}

classSessionsRouter.post(
  "/",
  requireStaff(),
  validateBody(z.object({ classroomId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const classroom = await assertClassroomAccess(staff, req.body.classroomId);
    await saveSession(classroom.classCode, classroom.id);
    res.status(201).json({
      code: classroom.classCode,
      qrPayload: `${env.WEB_ORIGIN}/join/${classroom.classCode}`,
      expiresAt: new Date(Date.now() + TTL_SEC * 1000).toISOString(),
    });
  }),
);

/** Actividad en vivo (polling docente cada ~10 s). */
classSessionsRouter.get(
  "/:code/live",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const code = String(req.params["code"]).toUpperCase();
    const session = await loadSession(code);
    if (!session) throw notFound("Sesión de clase no activa");
    await assertClassroomAccess(staff, session.classroomId);

    const since = new Date(session.startedAt);
    const attempts = await prisma.attempt.findMany({
      where: { classroomId: session.classroomId, startedAt: { gte: since } },
      select: {
        playerId: true,
        status: true,
        benchmarkSlug: true,
        startedAt: true,
        player: { select: { displayName: true, avatarId: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    const byPlayer = new Map<
      string,
      { displayName: string; avatarId: string; attempts: number; lastAt: string }
    >();
    for (const a of attempts) {
      const cur = byPlayer.get(a.playerId);
      if (cur) cur.attempts++;
      else
        byPlayer.set(a.playerId, {
          displayName: a.player.displayName,
          avatarId: a.player.avatarId,
          attempts: 1,
          lastAt: a.startedAt.toISOString(),
        });
    }
    res.json({
      startedAt: since.toISOString(),
      totalAttempts: attempts.filter((a) => a.status === "COMPLETED").length,
      players: [...byPlayer.values()],
    });
  }),
);
