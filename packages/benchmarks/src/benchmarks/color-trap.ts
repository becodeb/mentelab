import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

export const TRAP_COLORS = [
  { key: "rojo", label: "ROJO", hex: "#cb4429" },
  { key: "verde", label: "VERDE", hex: "#4f7d43" },
  { key: "azul", label: "AZUL", hex: "#4a6bb5" },
  { key: "amarillo", label: "AMARILLO", hex: "#d99a26" },
] as const;

const ConfigSchema = z.object({
  durationSec: z.number().int().min(20).max(90),
  /** Probabilidad de que palabra y tinta NO coincidan (el conflicto). */
  incongruentProbability: z.number().min(0.3).max(0.8),
});
export type ColorTrapConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
  avgMs: z.number(),
  congruentAvgMs: z.number(),
  incongruentAvgMs: z.number(),
  /** Costo Stroop: cuánto más tarda cuando la palabra miente (ms). */
  stroopCostMs: z.number(),
  maxStreak: z.number().int(),
});
export type ColorTrapMetrics = z.infer<typeof MetricsSchema>;

/**
 * TRAMPA DE COLOR — original de MenteLab (efecto Stroop). La palabra dice
 * un color pero está pintada de otro: hay que tocar el color de la TINTA.
 * Mide control inhibitorio y atención selectiva.
 */
export const colorTrap: BenchmarkDefinition<ColorTrapConfig, ColorTrapMetrics> = {
  slug: "color-trap",
  name: "Trampa de Color",
  shortDescription: "La palabra miente: tocá el color de la tinta",
  instructions: [
    "Vas a ver una palabra pintada de un color.",
    "¡Ojo! La palabra puede mentir.",
    "Tocá el color de la TINTA, no lo que dice la palabra.",
    "Sumá todos los aciertos que puedas antes de que se acabe el tiempo.",
  ],
  icon: "🎨",
  category: "ATTENTION",
  minAge: 7,
  unit: "aciertos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["prompt_shown", "color_answer"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 8;
    return { durationSec: 45, incongruentProbability: young ? 0.5 : 0.65 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "color_answer");
    const correct = answers.filter((a) => a["correct"] === true);
    const times = (list: Record<string, unknown>[]) =>
      list.map((a) => Number(a["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    const congruent = times(correct.filter((a) => a["congruent"] === true));
    const incongruent = times(correct.filter((a) => a["congruent"] === false));
    let streak = 0;
    let maxStreak = 0;
    for (const a of answers) {
      streak = a["correct"] === true ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }
    const congruentAvg = Math.round(mean(congruent));
    const incongruentAvg = Math.round(mean(incongruent));
    return {
      correct: correct.length,
      wrong: answers.length - correct.length,
      avgMs: Math.round(mean(times(correct))),
      congruentAvgMs: congruentAvg,
      incongruentAvgMs: incongruentAvg,
      stroopCostMs: congruent.length && incongruent.length ? incongruentAvg - congruentAvg : 0,
      maxStreak,
    };
  },
  score(m) {
    return m.correct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 12, sigma: 6 },
    { age: 8, p50: 17, sigma: 7 },
    { age: 10, p50: 22, sigma: 8 },
    { age: 12, p50: 26, sigma: 9 },
    { age: 14, p50: 30, sigma: 9 },
    { age: 16, p50: 33, sigma: 10 },
    { age: 18, p50: 34, sigma: 10 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrong, successCount: m.correct };
  },
  contributions: { visual_attention: 0.3, precision: 0.2 },
  masteryLevels: { bronze: 25, silver: 35, gold: 45 },
};
