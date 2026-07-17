import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  startLevel: z.number().int().min(1).max(10),
  lives: z.number().int().min(1).max(5),
  showMs: z.number().int().min(500).max(3000),
});
export type VisualMemoryConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  maxLevel: z.number().int(),
  livesUsed: z.number().int(),
  totalClicks: z.number().int(),
  correctClicks: z.number().int(),
  accuracy: z.number(),
  avgClickLatencyMs: z.number(),
  levelsCompleted: z.number().int(),
});
export type VisualMemoryMetrics = z.infer<typeof MetricsSchema>;

export const visualMemory: BenchmarkDefinition<VisualMemoryConfig, VisualMemoryMetrics> = {
  slug: "visual-memory",
  name: "Memoria Visual",
  shortDescription: "Recordá qué casillas se iluminaron",
  instructions: [
    "Algunas casillas se van a iluminar por un momento.",
    "Cuando se apaguen, tocá cuáles eran.",
    "Cada nivel tiene más casillas. Tenés 3 vidas.",
  ],
  icon: "👁️",
  category: "ATTENTION",
  minAge: 5,
  unit: "nivel",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["pattern_shown", "tile_click", "level_complete", "life_lost"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return { startLevel: 1, lives: 3, showMs: young ? 1500 : 1000 };
  },
  adaptConfig(config, ctx) {
    if (ctx.bestScore !== null && ctx.bestScore >= 4) {
      return { ...config, startLevel: Math.min(6, Math.floor(ctx.bestScore) - 2) };
    }
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const clicks = eventsOfType(events, "tile_click");
    const completes = eventsOfType(events, "level_complete");
    const correct = clicks.filter((p) => p["correct"] === true);
    const latencies = clicks
      .map((p) => Number(p["latencyMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const maxLevel = completes.length
      ? Math.max(...completes.map((p) => Number(p["level"]) || 0))
      : 0;
    return {
      maxLevel,
      livesUsed: eventsOfType(events, "life_lost").length,
      totalClicks: clicks.length,
      correctClicks: correct.length,
      accuracy: clicks.length ? Math.round((correct.length / clicks.length) * 1000) / 1000 : 0,
      avgClickLatencyMs: Math.round(mean(latencies)),
      levelsCompleted: completes.length,
    };
  },
  score(m) {
    return m.maxLevel;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 5, sigma: 1.8 },
    { age: 8, p50: 6, sigma: 2 },
    { age: 10, p50: 7, sigma: 2.2 },
    { age: 12, p50: 8, sigma: 2.3 },
    { age: 14, p50: 8.5, sigma: 2.4 },
    { age: 16, p50: 9, sigma: 2.4 },
    { age: 18, p50: 9.5, sigma: 2.5 },
  ],
  summarize(m) {
    return {
      levelReached: m.maxLevel,
      errorCount: m.totalClicks - m.correctClicks,
      successCount: m.correctClicks,
    };
  },
  contributions: { visual_attention: 0.4, precision: 0.3 },
  masteryLevels: { bronze: 8, silver: 11, gold: 14 },
};
