import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean, median, stdDev } from "../utils/stats";

const ConfigSchema = z.object({
  rounds: z.number().int().min(6).max(24),
  /** Diferencia inicial del intruso (%): menor = más difícil. */
  startDeltaPct: z.number().min(8).max(60),
});
export type OddOneOutConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  roundTimesMs: z.array(z.number()),
  meanMs: z.number(),
  medianMs: z.number(),
  stdDevMs: z.number(),
  wrongPicks: z.number().int(),
  roundsCompleted: z.number().int(),
  /** Delta % del round más difícil resuelto (sensibilidad perceptiva). */
  hardestDeltaSolved: z.number().nullable(),
});
export type OddOneOutMetrics = z.infer<typeof MetricsSchema>;

/**
 * EL INTRUSO — original de MenteLab. Búsqueda visual: una figura difiere
 * sutilmente del resto (tono/rotación). Cada ronda agranda la grilla y
 * achica la diferencia. Mide velocidad de barrido y sensibilidad perceptiva.
 */
export const oddOneOut: BenchmarkDefinition<OddOneOutConfig, OddOneOutMetrics> = {
  slug: "odd-one-out",
  name: "El Intruso",
  shortDescription: "Encontrá la figura distinta antes de que se esconda mejor",
  instructions: [
    "Todas las figuras parecen iguales… pero UNA es distinta.",
    "Tocala lo más rápido que puedas.",
    "Cada ronda hay más figuras y el intruso se disfraza mejor.",
  ],
  icon: "🔍",
  category: "ATTENTION",
  minAge: 5,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["round_shown", "cell_pick"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return { rounds: young ? 8 : 12, startDeltaPct: young ? 45 : 35 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const picks = eventsOfType(events, "cell_pick");
    const correct = picks.filter((p) => p["correct"] === true);
    const times = correct
      .map((p) => Number(p["ms"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const deltas = correct
      .map((p) => Number(p["deltaPct"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    return {
      roundTimesMs: times.map((t) => Math.round(t)),
      meanMs: Math.round(mean(times)),
      medianMs: Math.round(median(times)),
      stdDevMs: Math.round(stdDev(times)),
      wrongPicks: picks.length - correct.length,
      roundsCompleted: correct.length,
      hardestDeltaSolved: deltas.length ? Math.min(...deltas) : null,
    };
  },
  score(m) {
    return m.medianMs;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 2600, sigma: 750 },
    { age: 8, p50: 2200, sigma: 650 },
    { age: 10, p50: 1900, sigma: 550 },
    { age: 12, p50: 1650, sigma: 500 },
    { age: 14, p50: 1500, sigma: 450 },
    { age: 16, p50: 1400, sigma: 420 },
    { age: 18, p50: 1350, sigma: 400 },
  ],
  summarize(m) {
    return { levelReached: m.roundsCompleted, errorCount: m.wrongPicks, successCount: m.roundsCompleted };
  },
  contributions: { visual_attention: 0.35, reaction_speed: 0.15 },
  masteryLevels: { bronze: 1800, silver: 1300, gold: 950 },
};
