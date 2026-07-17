import { z } from "zod";
import { LeaderboardScope, LeaderboardPeriod, RankingMetric } from "./enums";

export const LeaderboardQuerySchema = z.object({
  scope: LeaderboardScope,
  scopeId: z.string().uuid().optional(), // classroom/grade/institution id; edad usa ageValue
  ageValue: z.coerce.number().int().min(4).max(20).optional(),
  benchmark: z.string().min(1),
  period: LeaderboardPeriod.default("30d"),
  metric: RankingMetric.default("best"),
  around: z.enum(["me"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int(),
  playerId: z.string(),
  displayName: z.string(),
  avatarId: z.string(),
  value: z.number(),
  isMe: z.boolean().default(false),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
  myEntry: LeaderboardEntrySchema.nullable(),
  totalPlayers: z.number().int(),
  metric: RankingMetric,
  scoreDirection: z.enum(["higher_better", "lower_better"]),
  unit: z.string(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
