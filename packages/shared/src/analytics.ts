import { z } from "zod";

export const AnalyticsFilterSchema = z.object({
  classroomId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  benchmark: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "year", "all"]).default("30d"),
  gender: z.enum(["F", "M", "X"]).optional(),
  /** Excluir intentos con foco perdido / inválidos para análisis "limpios". */
  cleanOnly: z.coerce.boolean().default(false),
});
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;

export const AnalyticsOverviewSchema = z.object({
  studentCount: z.number().int(),
  activeLast7d: z.number().int(),
  attemptsInPeriod: z.number().int(),
  totalPlayMs: z.number(),
  avgImprovementPct: z.number().nullable(),
  studentsAtRisk: z.number().int(), // sin jugar hace 14+ días
});
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

export const DistributionResponseSchema = z.object({
  bins: z.array(z.object({ from: z.number(), to: z.number(), count: z.number().int() })),
  boxplot: z
    .object({
      min: z.number(),
      p25: z.number(),
      median: z.number(),
      p75: z.number(),
      max: z.number(),
      mean: z.number(),
    })
    .nullable(),
  unit: z.string(),
  sampleSize: z.number().int(),
});
export type DistributionResponse = z.infer<typeof DistributionResponseSchema>;

export const EvolutionResponseSchema = z.object({
  series: z.array(
    z.object({
      weekStart: z.string(),
      mean: z.number(),
      p25: z.number(),
      p75: z.number(),
      attempts: z.number().int(),
    }),
  ),
  unit: z.string(),
});
export type EvolutionResponse = z.infer<typeof EvolutionResponseSchema>;

export const HeatmapResponseSchema = z.object({
  /** Actividad por día de semana (0=domingo) × hora (0-23). */
  cells: z.array(
    z.object({ dow: z.number().int(), hour: z.number().int(), count: z.number().int() }),
  ),
});
export type HeatmapResponse = z.infer<typeof HeatmapResponseSchema>;

export const CompareResponseSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      mean: z.number().nullable(),
      median: z.number().nullable(),
      best: z.number().nullable(),
      attempts: z.number().int(),
      students: z.number().int(),
    }),
  ),
  unit: z.string(),
});
export type CompareResponse = z.infer<typeof CompareResponseSchema>;

export const StudentRowSchema = z.object({
  playerId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarId: z.string(),
  active: z.boolean(),
  classroomId: z.string().uuid(),
  birthYear: z.number().int().nullable(),
  gender: z.enum(["F", "M", "X"]).nullable(),
  totalAttempts: z.number().int(),
  bestScore: z.number().nullable(),
  avg30d: z.number().nullable(),
  improvement30dPct: z.number().nullable(),
  lastPlayedAt: z.string().nullable(),
  currentStreak: z.number().int(),
});
export type StudentRow = z.infer<typeof StudentRowSchema>;
