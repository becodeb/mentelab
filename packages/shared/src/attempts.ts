import { z } from "zod";
import { AttemptEventSchema, DeviceInfoSchema } from "./events";
import { AttemptStatus } from "./enums";

export const StartAttemptSchema = z.object({
  benchmarkSlug: z.string().min(1).max(64),
});
export type StartAttemptInput = z.infer<typeof StartAttemptSchema>;

export const StartAttemptResponseSchema = z.object({
  attemptId: z.string().uuid(),
  /** Configuración de dificultad adaptada (validada por el configSchema del benchmark). */
  config: z.record(z.unknown()),
});
export type StartAttemptResponse = z.infer<typeof StartAttemptResponseSchema>;

export const CompleteAttemptSchema = z.object({
  events: z.array(AttemptEventSchema).max(20000),
  device: DeviceInfoSchema.optional(),
  avgFps: z.number().positive().max(1000).optional(),
  focusLostCount: z.number().int().nonnegative().default(0),
  pauseCount: z.number().int().nonnegative().default(0),
  durationMs: z.number().int().positive(),
  appVersion: z.string().max(32).optional(),
});
export type CompleteAttemptInput = z.infer<typeof CompleteAttemptSchema>;

/** Resumen de recompensas que devuelve `complete` para la pantalla de resultados. */
export const RewardsSummarySchema = z.object({
  xpEarned: z.number().int(),
  xpBreakdown: z.array(z.object({ reason: z.string(), amount: z.number().int() })),
  totalXp: z.number().int(),
  level: z.number().int(),
  levelUp: z.boolean(),
  xpIntoLevel: z.number().int(),
  xpForNextLevel: z.number().int(),
  currentStreak: z.number().int(),
  streakExtended: z.boolean(),
  personalRecord: z.boolean(),
  newBadges: z.array(
    z.object({ code: z.string(), name: z.string(), emoji: z.string(), description: z.string() }),
  ),
  missionsAdvanced: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      progress: z.number().int(),
      target: z.number().int(),
      completed: z.boolean(),
    }),
  ),
  /** Frase positiva elegida por el motor anti-frustración. */
  encouragement: z.string(),
});
export type RewardsSummary = z.infer<typeof RewardsSummarySchema>;

export const CompleteAttemptResponseSchema = z.object({
  attemptId: z.string().uuid(),
  status: AttemptStatus,
  score: z.number(),
  scoreNormalized: z.number().nullable(),
  metrics: z.record(z.unknown()),
  rewards: RewardsSummarySchema,
  /** Posición en el ranking del curso (solo si la institución lo habilita). */
  classroomRank: z.number().int().nullable(),
});
export type CompleteAttemptResponse = z.infer<typeof CompleteAttemptResponseSchema>;

export const AttemptSummarySchema = z.object({
  id: z.string().uuid(),
  benchmarkSlug: z.string(),
  status: AttemptStatus,
  startedAt: z.string(),
  durationMs: z.number().nullable(),
  score: z.number().nullable(),
  scoreNormalized: z.number().nullable(),
  levelReached: z.number().nullable(),
  errorCount: z.number().nullable(),
  successCount: z.number().nullable(),
  metrics: z.record(z.unknown()).nullable(),
  focusLostCount: z.number(),
  avgFps: z.number().nullable(),
});
export type AttemptSummary = z.infer<typeof AttemptSummarySchema>;
