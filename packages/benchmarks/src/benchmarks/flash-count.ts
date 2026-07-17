import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  rounds: z.number().int().min(8).max(20),
  /** ms que se muestran los puntos (menos = más difícil). */
  flashMs: z.number().int().min(300).max(1500),
  maxDots: z.number().int().min(5).max(12),
});
export type FlashCountConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
  avgMs: z.number(),
  /** Acierto según cantidad: hasta dónde llega el "golpe de vista". */
  maxDotsCorrect: z.number().int(),
});
export type FlashCountMetrics = z.infer<typeof MetricsSchema>;

/**
 * ¿CUÁNTOS HAY? (subitizing) — los puntos aparecen un instante y desaparecen:
 * hay que decir cuántos eran, sin tiempo para contar de a uno. Percepción
 * numérica de golpe de vista.
 */
export const flashCount: BenchmarkDefinition<FlashCountConfig, FlashCountMetrics> = {
  slug: "flash-count",
  name: "¿Cuántos Hay?",
  shortDescription: "Los puntos desaparecen enseguida: ¿cuántos eran?",
  instructions: [
    "Van a aparecer puntos por UN instante.",
    "Cuando desaparezcan, elegí cuántos eran.",
    "No da tiempo a contar: ¡confiá en tu ojo!",
  ],
  icon: "✴️",
  category: "SPEED",
  minAge: 5,
  unit: "aciertos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["dots_shown", "count_answer"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return { rounds: 12, flashMs: young ? 900 : 650, maxDots: young ? 7 : 9 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "count_answer");
    const correct = answers.filter((a) => a["correct"] === true);
    const times = correct.map((a) => Number(a["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    const dotsOk = correct
      .map((a) => Number(a["dots"]))
      .filter((v) => Number.isFinite(v));
    return {
      correct: correct.length,
      wrong: answers.length - correct.length,
      avgMs: Math.round(mean(times)),
      maxDotsCorrect: dotsOk.length ? Math.max(...dotsOk) : 0,
    };
  },
  score(m) {
    return m.correct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 7, sigma: 2.5 },
    { age: 8, p50: 8, sigma: 2.5 },
    { age: 10, p50: 9, sigma: 2 },
    { age: 12, p50: 9.5, sigma: 2 },
    { age: 14, p50: 10, sigma: 2 },
    { age: 16, p50: 10.5, sigma: 1.8 },
    { age: 18, p50: 10.5, sigma: 1.8 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrong, successCount: m.correct };
  },
  contributions: { visual_attention: 0.25, working_memory: 0.1 },
  masteryLevels: { bronze: 9, silver: 11, gold: 12 },
};
