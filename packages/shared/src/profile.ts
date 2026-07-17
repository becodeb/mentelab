import { z } from "zod";
import { CognitiveIndicator } from "./enums";

/** Resumen para el hub del alumno. */
export const MeSummarySchema = z.object({
  playerId: z.string().uuid(),
  displayName: z.string(),
  avatarId: z.string(),
  isGuest: z.boolean(),
  xp: z.number().int(),
  level: z.number().int(),
  xpIntoLevel: z.number().int(),
  xpForNextLevel: z.number().int(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
  totalAttempts: z.number().int(),
  totalPlayMs: z.number(),
  badgeCount: z.number().int(),
  missions: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      emoji: z.string(),
      progress: z.number().int(),
      target: z.number().int(),
      completed: z.boolean(),
      xpReward: z.number().int(),
    }),
  ),
  /** Últimos benchmarks jugados con su récord, para las cards del hub. */
  perBenchmark: z.array(
    z.object({
      benchmarkSlug: z.string(),
      totalAttempts: z.number().int(),
      bestScore: z.number().nullable(),
      lastPlayedAt: z.string().nullable(),
      /** Posición en el curso (30 días, mejor marca) — solo alumnos. */
      classroomRank: z.number().int().nullable(),
      classroomTotal: z.number().int().nullable(),
    }),
  ),
});
export type MeSummary = z.infer<typeof MeSummarySchema>;

export const BenchmarkStatsSchema = z.object({
  benchmarkSlug: z.string(),
  totalAttempts: z.number().int(),
  totalPlayMs: z.number(),
  bestScore: z.number().nullable(),
  bestAt: z.string().nullable(),
  avgAllTime: z.number().nullable(),
  avg30d: z.number().nullable(),
  improvement30dPct: z.number().nullable(),
  consistency30d: z.number().nullable(),
  currentRank: z.number().int().nullable(),
  totalInRank: z.number().int().nullable(),
  /** Serie para el gráfico de evolución: un punto por intento completado. */
  history: z.array(
    z.object({
      attemptId: z.string(),
      at: z.string(),
      score: z.number(),
      isRecord: z.boolean(),
    }),
  ),
});
export type BenchmarkStats = z.infer<typeof BenchmarkStatsSchema>;

export const CognitiveProfileSchema = z.object({
  indicators: z.array(
    z.object({
      indicator: CognitiveIndicator,
      value: z.number().min(0).max(100).nullable(),
      trend: z.enum(["up", "down", "flat"]).nullable(),
      sampleSize: z.number().int(),
      history: z.array(z.object({ weekEnd: z.string(), value: z.number() })),
    }),
  ),
  /** Aviso obligatorio: indicador lúdico-educativo, no diagnóstico. */
  disclaimer: z.string(),
});
export type CognitiveProfile = z.infer<typeof CognitiveProfileSchema>;

export const PlayerBadgeSchema = z.object({
  code: z.string(),
  name: z.string(),
  emoji: z.string(),
  description: z.string(),
  family: z.enum(["constancy", "effort", "improvement", "mastery"]),
  earnedAt: z.string().nullable(), // null = todavía no ganada (para mostrar el catálogo)
});
export type PlayerBadge = z.infer<typeof PlayerBadgeSchema>;
