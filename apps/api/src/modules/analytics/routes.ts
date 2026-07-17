import { Router } from "express";
import { prisma } from "@mentelab/db";
import {
  AnalyticsFilterSchema,
  type AnalyticsFilter,
  type AnalyticsOverview,
  type CompareResponse,
  type DistributionResponse,
  type EvolutionResponse,
  type HeatmapResponse,
} from "@mentelab/shared";
import { getBenchmark, mean, percentile } from "@mentelab/benchmarks";
import { asyncHandler, badRequest, forbidden } from "../../core/errors";
import { validateQuery, getQuery } from "../../core/validate";
import { requireStaff, staffOf } from "../../core/auth";
import { cacheGet, cacheSet } from "../../core/redis";
import { assertClassroomAccess } from "../roster/service";
import type { Principal } from "@mentelab/shared";

export const analyticsRouter: ReturnType<typeof Router> = Router();

type Staff = Extract<Principal, { kind: "staff" }>;

function periodStart(period: AnalyticsFilter["period"]): Date | null {
  const days = { "7d": 7, "30d": 30, "90d": 90 }[period as string];
  if (days) return new Date(Date.now() - days * 86_400_000);
  if (period === "year") return new Date(new Date().getFullYear(), 0, 1);
  return null;
}

/** Filtro de attempts SIEMPRE scopeado al tenant del staff (doc 07 §2). */
async function buildWhere(staff: Staff, f: AnalyticsFilter): Promise<Record<string, unknown>> {
  if (!staff.institutionId && staff.role !== "SUPER_ADMIN")
    throw forbidden();
  const where: Record<string, unknown> = {
    scope: "INSTITUTIONAL",
    institutionId: staff.institutionId,
    status: "COMPLETED",
  };
  if (f.classroomId) {
    await assertClassroomAccess(staff, f.classroomId);
    where["classroomId"] = f.classroomId;
  }
  if (f.gradeId) {
    const grade = await prisma.grade.findUnique({ where: { id: f.gradeId } });
    if (!grade || grade.institutionId !== staff.institutionId) throw badRequest("Grado inválido");
    where["gradeLevel"] = grade.level;
  }
  if (f.benchmark) where["benchmarkSlug"] = f.benchmark;
  const from = periodStart(f.period);
  if (from) where["startedAt"] = { gte: from };
  if (f.gender) where["player"] = { gender: f.gender };
  if (f.cleanOnly) {
    where["focusLostCount"] = 0;
    where["pauseCount"] = 0;
  }
  return where;
}

analyticsRouter.get(
  "/overview",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    const where = await buildWhere(staff, f);

    const studentWhere = {
      institutionId: staff.institutionId ?? undefined,
      ...(f.classroomId ? { classroomId: f.classroomId } : {}),
      player: { active: true },
    };
    const [studentCount, attempts, playersActive7d, statsAgg] = await Promise.all([
      prisma.studentProfile.count({ where: studentWhere }),
      prisma.attempt.aggregate({ where, _count: { _all: true }, _sum: { durationMs: true } }),
      prisma.attempt.groupBy({
        by: ["playerId"],
        where: { ...where, startedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      }),
      prisma.playerBenchmarkStats.aggregate({
        where: {
          player: { studentProfile: studentWhere },
          ...(f.benchmark ? { benchmarkSlug: f.benchmark } : {}),
        },
        _avg: { improvement30dPct: true },
      }),
    ]);

    const riskCutoff = new Date(Date.now() - 14 * 86_400_000);
    const playedRecently = await prisma.attempt.groupBy({
      by: ["playerId"],
      where: {
        scope: "INSTITUTIONAL",
        institutionId: staff.institutionId,
        ...(f.classroomId ? { classroomId: f.classroomId } : {}),
        startedAt: { gte: riskCutoff },
      },
    });
    const activeIds = new Set(playedRecently.map((p) => p.playerId));
    const allStudents = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: { playerId: true },
    });
    const studentsAtRisk = allStudents.filter((s) => !activeIds.has(s.playerId)).length;

    const overview: AnalyticsOverview = {
      studentCount,
      activeLast7d: playersActive7d.length,
      attemptsInPeriod: attempts._count._all,
      totalPlayMs: attempts._sum.durationMs ?? 0,
      avgImprovementPct: statsAgg._avg.improvement30dPct
        ? Math.round(statsAgg._avg.improvement30dPct * 10) / 10
        : null,
      studentsAtRisk,
    };
    res.json(overview);
  }),
);

analyticsRouter.get(
  "/distribution",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    if (!f.benchmark) throw badRequest("benchmark requerido");
    const def = getBenchmark(f.benchmark);
    const where = await buildWhere(staff, f);

    const cacheKey = `an:dist:${JSON.stringify(where)}`;
    const cached = await cacheGet<DistributionResponse>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const rows = await prisma.attempt.findMany({
      where: { ...where, score: { not: null } },
      select: { score: true },
      take: 20_000,
    });
    const scores = rows.map((r) => r.score!);
    let response: DistributionResponse;
    if (scores.length === 0) {
      response = { bins: [], boxplot: null, unit: def.unit, sampleSize: 0 };
    } else {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const binCount = Math.min(12, Math.max(5, Math.round(Math.sqrt(scores.length))));
      const width = (max - min) / binCount || 1;
      const bins = Array.from({ length: binCount }, (_, i) => ({
        from: Math.round((min + i * width) * 10) / 10,
        to: Math.round((min + (i + 1) * width) * 10) / 10,
        count: 0,
      }));
      for (const s of scores) {
        const idx = Math.min(binCount - 1, Math.floor((s - min) / width));
        bins[idx]!.count++;
      }
      response = {
        bins,
        boxplot: {
          min,
          p25: Math.round(percentile(scores, 25) * 10) / 10,
          median: Math.round(percentile(scores, 50) * 10) / 10,
          p75: Math.round(percentile(scores, 75) * 10) / 10,
          max,
          mean: Math.round(mean(scores) * 10) / 10,
        },
        unit: def.unit,
        sampleSize: scores.length,
      };
    }
    await cacheSet(cacheKey, response, 300);
    res.json(response);
  }),
);

analyticsRouter.get(
  "/evolution",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    if (!f.benchmark) throw badRequest("benchmark requerido");
    const def = getBenchmark(f.benchmark);
    const where = await buildWhere(staff, f);

    const rows = await prisma.attempt.findMany({
      where: { ...where, score: { not: null } },
      select: { score: true, startedAt: true },
      orderBy: { startedAt: "asc" },
      take: 20_000,
    });
    // Agrupación semanal (lunes como inicio).
    const byWeek = new Map<string, number[]>();
    for (const r of rows) {
      const d = new Date(r.startedAt);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const arr = byWeek.get(key) ?? [];
      arr.push(r.score!);
      byWeek.set(key, arr);
    }
    const response: EvolutionResponse = {
      series: [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, scores]) => ({
          weekStart,
          mean: Math.round(mean(scores) * 10) / 10,
          p25: Math.round(percentile(scores, 25) * 10) / 10,
          p75: Math.round(percentile(scores, 75) * 10) / 10,
          attempts: scores.length,
        })),
      unit: def.unit,
    };
    res.json(response);
  }),
);

analyticsRouter.get(
  "/heatmap",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    const where = await buildWhere(staff, f);
    const rows = await prisma.attempt.findMany({
      where,
      select: { startedAt: true },
      take: 20_000,
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.startedAt.getDay()}:${r.startedAt.getHours()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const response: HeatmapResponse = {
      cells: [...counts.entries()].map(([k, count]) => {
        const [dow, hour] = k.split(":").map(Number);
        return { dow: dow!, hour: hour!, count };
      }),
    };
    res.json(response);
  }),
);

analyticsRouter.get(
  "/compare",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw forbidden();
    const dimension = String(req.query["dimension"] ?? "classroom");
    const benchmark = req.query["benchmark"] ? String(req.query["benchmark"]) : null;
    const period = (String(req.query["period"] ?? "30d")) as AnalyticsFilter["period"];
    if (!benchmark && dimension !== "benchmark") throw badRequest("benchmark requerido");
    const from = periodStart(period);
    const def = benchmark ? getBenchmark(benchmark) : null;

    const baseWhere = {
      scope: "INSTITUTIONAL" as const,
      institutionId: staff.institutionId,
      status: "COMPLETED" as const,
      score: { not: null },
      ...(from ? { startedAt: { gte: from } } : {}),
    };

    const groups: CompareResponse["groups"] = [];
    if (dimension === "classroom") {
      const classrooms = await prisma.classroom.findMany({
        where: { institutionId: staff.institutionId, active: true },
        include: { grade: true },
      });
      for (const c of classrooms) {
        const rows = await prisma.attempt.findMany({
          where: { ...baseWhere, benchmarkSlug: benchmark!, classroomId: c.id },
          select: { score: true, playerId: true },
          take: 10_000,
        });
        groups.push(groupStats(c.id, `${c.grade.name} ${c.division}`, rows));
      }
    } else if (dimension === "grade" || dimension === "age") {
      const field = dimension === "grade" ? "gradeLevel" : "playerAge";
      const grouped = await prisma.attempt.findMany({
        where: { ...baseWhere, benchmarkSlug: benchmark! },
        select: { score: true, playerId: true, gradeLevel: true, playerAge: true },
        take: 20_000,
      });
      const byKey = new Map<number, { score: number | null; playerId: string }[]>();
      for (const r of grouped) {
        const key = (dimension === "grade" ? r.gradeLevel : r.playerAge) ?? -1;
        if (key === -1) continue;
        const arr = byKey.get(key) ?? [];
        arr.push(r);
        byKey.set(key, arr);
      }
      for (const [key, rows] of [...byKey.entries()].sort(([a], [b]) => a - b)) {
        const label = dimension === "grade" ? `Grado ${key}` : `${key} años`;
        groups.push(groupStats(String(key), label, rows));
      }
      void field;
    } else if (dimension === "gender") {
      for (const g of ["F", "M", "X"] as const) {
        const rows = await prisma.attempt.findMany({
          where: { ...baseWhere, benchmarkSlug: benchmark!, player: { gender: g } },
          select: { score: true, playerId: true },
          take: 10_000,
        });
        if (rows.length) groups.push(groupStats(g, g === "F" ? "Femenino" : g === "M" ? "Masculino" : "X", rows));
      }
    } else if (dimension === "benchmark") {
      const { benchmarkRegistry } = await import("@mentelab/benchmarks");
      for (const b of benchmarkRegistry.values()) {
        const rows = await prisma.attempt.findMany({
          where: { ...baseWhere, benchmarkSlug: b.slug, scoreNormalized: { not: null } },
          select: { scoreNormalized: true, playerId: true },
          take: 10_000,
        });
        // Entre benchmarks se compara el score NORMALIZADO (misma escala).
        groups.push(
          groupStats(
            b.slug,
            `${b.icon} ${b.name}`,
            rows.map((r) => ({ score: r.scoreNormalized, playerId: r.playerId })),
          ),
        );
      }
    } else {
      throw badRequest("dimension inválida");
    }

    const response: CompareResponse = {
      groups,
      unit: dimension === "benchmark" ? "puntos (0-100)" : (def?.unit ?? ""),
    };
    res.json(response);
  }),
);

function groupStats(
  id: string,
  label: string,
  rows: { score: number | null; playerId: string }[],
): CompareResponse["groups"][number] {
  const scores = rows.map((r) => r.score).filter((s): s is number => s != null);
  return {
    id,
    label,
    mean: scores.length ? Math.round(mean(scores) * 10) / 10 : null,
    median: scores.length ? Math.round(percentile(scores, 50) * 10) / 10 : null,
    best: scores.length ? Math.round(Math.max(...scores) * 10) / 10 : null,
    attempts: scores.length,
    students: new Set(rows.map((r) => r.playerId)).size,
  };
}
