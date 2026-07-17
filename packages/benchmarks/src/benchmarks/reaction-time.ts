import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { consistency, linRegSlope, mean, median, stdDev } from "../utils/stats";

const ConfigSchema = z.object({
  rounds: z.number().int().min(3).max(10),
  minDelayMs: z.number().int().min(500),
  maxDelayMs: z.number().int().max(8000),
});
export type ReactionTimeConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  roundTimesMs: z.array(z.number()),
  meanMs: z.number(),
  medianMs: z.number(),
  bestMs: z.number(),
  worstMs: z.number(),
  stdDevMs: z.number(),
  consistency: z.number(),
  falseStarts: z.number().int(),
  /** Reacciones < 120 ms: humanamente imposibles, probables anticipaciones. */
  anticipations: z.number().int(),
  /** Pendiente ms/ronda: negativa = mejoró durante la sesión. */
  intraSessionTrend: z.number(),
});
export type ReactionTimeMetrics = z.infer<typeof MetricsSchema>;

const ANTICIPATION_THRESHOLD_MS = 120;

export const reactionTime: BenchmarkDefinition<ReactionTimeConfig, ReactionTimeMetrics> = {
  slug: "reaction-time",
  name: "Tiempo de Reacción",
  shortDescription: "Tocá lo más rápido que puedas cuando cambie el color",
  instructions: [
    "Esperá con la pantalla en rojo.",
    "Cuando se ponga VERDE y diga ¡AHORA!, tocá lo más rápido que puedas.",
    "Si tocás antes de tiempo, la ronda no cuenta. ¡Paciencia!",
  ],
  icon: "⚡",
  category: "SPEED",
  minAge: 5,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["stimulus_shown", "round_click", "false_start"] as const,

  defaultConfigFor(age) {
    // Menos rondas para los más chicos (atención sostenida más corta).
    const rounds = age !== null && age <= 7 ? 4 : 5;
    return { rounds, minDelayMs: 1200, maxDelayMs: 4500 };
  },
  adaptConfig(config) {
    return config; // sin adaptación por historial: el juego ya es auto-nivelado
  },

  computeMetrics(events: AttemptEvent[]) {
    const clicks = eventsOfType(events, "round_click");
    const times = clicks
      .map((p) => Number(p["reactionMs"]))
      .filter((t) => Number.isFinite(t) && t > 0);
    const valid = times.filter((t) => t >= ANTICIPATION_THRESHOLD_MS);
    const falseStarts = eventsOfType(events, "false_start").length;
    const trend = linRegSlope(valid.map((y, x) => ({ x, y })));
    return {
      roundTimesMs: times.map((t) => Math.round(t * 10) / 10),
      meanMs: Math.round(mean(valid) * 10) / 10,
      medianMs: Math.round(median(valid) * 10) / 10,
      bestMs: valid.length ? Math.round(Math.min(...valid) * 10) / 10 : 0,
      worstMs: valid.length ? Math.round(Math.max(...valid) * 10) / 10 : 0,
      stdDevMs: Math.round(stdDev(valid) * 10) / 10,
      consistency: Math.round(consistency(valid) * 1000) / 1000,
      falseStarts,
      anticipations: times.length - valid.length,
      intraSessionTrend: Math.round(trend * 100) / 100,
    };
  },
  score(m) {
    return m.medianMs; // la mediana es robusta a una ronda distraída
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 520, sigma: 90 },
    { age: 8, p50: 450, sigma: 85 },
    { age: 10, p50: 400, sigma: 80 },
    { age: 12, p50: 370, sigma: 75 },
    { age: 14, p50: 340, sigma: 70 },
    { age: 16, p50: 320, sigma: 65 },
    { age: 18, p50: 310, sigma: 65 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.falseStarts + m.anticipations,
      successCount: m.roundTimesMs.length - m.anticipations,
    };
  },
  contributions: { reaction_speed: 0.7 },
  masteryLevels: { bronze: 420, silver: 340, gold: 280 },
};
