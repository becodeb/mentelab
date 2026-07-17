import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  /** Lado de la grilla (3 → buscar 1..9). */
  gridSide: z.number().int().min(3).max(6),
});
export type NumberHuntConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  totalMs: z.number(),
  /** ms promedio por número encontrado (score, menor = mejor). */
  avgMsPerNumber: z.number(),
  wrongTaps: z.number().int(),
  numbersFound: z.number().int(),
  /** ¿Se aceleró o se frenó? pendiente de los intervalos. */
  slowestGapMs: z.number(),
});
export type NumberHuntMetrics = z.infer<typeof MetricsSchema>;

/**
 * BUSCA NÚMEROS (tabla de Schulte) — clásico del entrenamiento de atención:
 * números desordenados en una grilla, tocarlos en orden 1→N lo más rápido
 * posible. Entrena visión periférica y barrido visual.
 */
export const numberHunt: BenchmarkDefinition<NumberHuntConfig, NumberHuntMetrics> = {
  slug: "number-hunt",
  name: "Busca Números",
  shortDescription: "Encontrá y tocá los números en orden, contrarreloj",
  instructions: [
    "Los números están desordenados en la grilla.",
    "Tocalos en orden: 1, 2, 3…",
    "¡Lo más rápido que puedas!",
  ],
  icon: "🔢",
  category: "ATTENTION",
  minAge: 6,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["board_shown", "number_tap"] as const,

  defaultConfigFor(age) {
    if (age !== null && age <= 7) return { gridSide: 3 };
    if (age !== null && age <= 12) return { gridSide: 4 };
    return { gridSide: 5 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const taps = eventsOfType(events, "number_tap");
    const correct = taps.filter((t) => t["correct"] === true);
    const times = correct.map((t) => Number(t["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    const totalMs = times.length ? Math.max(...times) : 0;
    const gaps: number[] = [];
    const sorted = [...times].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i]! - sorted[i - 1]!);
    return {
      totalMs: Math.round(totalMs),
      avgMsPerNumber: correct.length ? Math.round(totalMs / correct.length) : 0,
      wrongTaps: taps.length - correct.length,
      numbersFound: correct.length,
      slowestGapMs: gaps.length ? Math.round(Math.max(...gaps)) : 0,
    };
  },
  score(m) {
    return m.numbersFound === 0 ? 10_000 : m.avgMsPerNumber;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 2800, sigma: 900 },
    { age: 8, p50: 2400, sigma: 800 },
    { age: 10, p50: 2000, sigma: 650 },
    { age: 12, p50: 1800, sigma: 600 },
    { age: 14, p50: 1600, sigma: 500 },
    { age: 16, p50: 1500, sigma: 480 },
    { age: 18, p50: 1450, sigma: 450 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrongTaps, successCount: m.numbersFound };
  },
  contributions: { visual_attention: 0.35, reaction_speed: 0.1 },
  masteryLevels: { bronze: 1800, silver: 1300, gold: 1000 },
};
