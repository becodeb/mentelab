import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  rounds: z.number().int().min(6).max(15),
  /** Cantidad de opciones por ronda. */
  options: z.number().int().min(2).max(4),
});
export type TwinShapesConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
  avgMs: z.number(),
  roundsPlayed: z.number().int(),
});
export type TwinShapesMetrics = z.infer<typeof MetricsSchema>;

/**
 * GEMELOS GIRADOS — rotación mental: una figura modelo y varias opciones
 * giradas; solo una es la misma (las otras están espejadas). Razonamiento
 * espacial puro, sin texto.
 */
export const twinShapes: BenchmarkDefinition<TwinShapesConfig, TwinShapesMetrics> = {
  slug: "twin-shapes",
  name: "Gemelos Girados",
  shortDescription: "¿Cuál es la misma figura, aunque esté girada?",
  instructions: [
    "Arriba hay una figura modelo.",
    "Abajo, varias parecidas pero giradas.",
    "Solo UNA es la misma de verdad (las otras están espejadas).",
    "¡Girala en tu cabeza y tocala!",
  ],
  icon: "🪞",
  category: "ATTENTION",
  minAge: 6,
  unit: "aciertos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["shapes_shown", "twin_answer"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 8;
    return { rounds: 10, options: young ? 2 : 3 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "twin_answer");
    const correct = answers.filter((a) => a["correct"] === true);
    const times = correct.map((a) => Number(a["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    return {
      correct: correct.length,
      wrong: answers.length - correct.length,
      avgMs: Math.round(mean(times)),
      roundsPlayed: answers.length,
    };
  },
  score(m) {
    return m.correct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 5, sigma: 2.2 },
    { age: 8, p50: 6, sigma: 2.2 },
    { age: 10, p50: 7, sigma: 2 },
    { age: 12, p50: 7.5, sigma: 2 },
    { age: 14, p50: 8, sigma: 1.8 },
    { age: 16, p50: 8.5, sigma: 1.8 },
    { age: 18, p50: 8.5, sigma: 1.8 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrong, successCount: m.correct };
  },
  contributions: { visual_attention: 0.2, working_memory: 0.2 },
  masteryLevels: { bronze: 7, silver: 9, gold: 10 },
};
