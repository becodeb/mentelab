import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean, stdDev } from "../utils/stats";

const ConfigSchema = z.object({
  targets: z.number().int().min(5).max(40),
  targetSizePx: z.number().int().min(32).max(120),
});
export type AimTrainerConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  targetTimesMs: z.array(z.number()),
  avgMsPerTarget: z.number(),
  bestMs: z.number(),
  worstMs: z.number(),
  stdDevMs: z.number(),
  misses: z.number().int(),
  /** Distancia media del toque al centro del target (px normalizados). */
  avgDistToCenterPx: z.number(),
  targetsHit: z.number().int(),
});
export type AimTrainerMetrics = z.infer<typeof MetricsSchema>;

export const aimTrainer: BenchmarkDefinition<AimTrainerConfig, AimTrainerMetrics> = {
  slug: "aim-trainer",
  name: "Puntería",
  shortDescription: "Tocá los blancos lo más rápido que puedas",
  instructions: [
    "Van a aparecer blancos en la pantalla, de a uno.",
    "Tocá cada blanco lo más rápido que puedas.",
    "Tocar fuera del blanco cuenta como error. ¡Precisión y velocidad!",
  ],
  icon: "🎯",
  category: "PRECISION",
  minAge: 5,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["target_shown", "target_hit", "target_miss"] as const,

  defaultConfigFor(age) {
    if (age !== null && age <= 7) return { targets: 10, targetSizePx: 88 };
    if (age !== null && age <= 10) return { targets: 15, targetSizePx: 72 };
    return { targets: 15, targetSizePx: 56 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const hits = eventsOfType(events, "target_hit");
    const times = hits.map((p) => Number(p["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    const dists = hits.map((p) => Number(p["distPx"])).filter((v) => Number.isFinite(v) && v >= 0);
    return {
      targetTimesMs: times.map((t) => Math.round(t)),
      avgMsPerTarget: Math.round(mean(times) * 10) / 10,
      bestMs: times.length ? Math.round(Math.min(...times)) : 0,
      worstMs: times.length ? Math.round(Math.max(...times)) : 0,
      stdDevMs: Math.round(stdDev(times) * 10) / 10,
      misses: eventsOfType(events, "target_miss").length,
      avgDistToCenterPx: Math.round(mean(dists) * 10) / 10,
      targetsHit: hits.length,
    };
  },
  score(m) {
    return m.avgMsPerTarget;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 1400, sigma: 320 },
    { age: 8, p50: 1150, sigma: 280 },
    { age: 10, p50: 1000, sigma: 250 },
    { age: 12, p50: 900, sigma: 220 },
    { age: 14, p50: 800, sigma: 200 },
    { age: 16, p50: 750, sigma: 190 },
    { age: 18, p50: 700, sigma: 180 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.misses, successCount: m.targetsHit };
  },
  contributions: { reaction_speed: 0.3, visual_attention: 0.3, precision: 0.4 },
  masteryLevels: { bronze: 900, silver: 700, gold: 550 },
};
