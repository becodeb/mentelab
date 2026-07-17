import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  durationSec: z.number().int().min(30).max(90),
  /** Cantidad de símbolos distintos en juego (menos = más fácil). */
  symbolCount: z.number().int().min(3).max(8),
});
export type SpeedMatchConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
  avgMs: z.number(),
  maxStreak: z.number().int(),
  /** Aciertos cuando SÍ era igual vs cuando NO (sesgo de respuesta). */
  hitsSame: z.number().int(),
  hitsDifferent: z.number().int(),
});
export type SpeedMatchMetrics = z.infer<typeof MetricsSchema>;

/**
 * ¿IGUAL AL ANTERIOR? — clásico speed match (1-back): aparece un símbolo
 * y hay que decidir si es igual al INMEDIATO anterior. Memoria de trabajo
 * en su forma más pura + velocidad de decisión.
 */
export const speedMatch: BenchmarkDefinition<SpeedMatchConfig, SpeedMatchMetrics> = {
  slug: "speed-match",
  name: "¿Igual al Anterior?",
  shortDescription: "¿La figura es igual a la que acabás de ver?",
  instructions: [
    "Mirá la figura que aparece.",
    "¿Es IGUAL a la anterior? Tocá SÍ o NO.",
    "La primera es de práctica: no hay anterior todavía.",
    "Respondé rápido: cada acierto suma.",
  ],
  icon: "🔁",
  category: "SPEED",
  minAge: 6,
  unit: "aciertos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["symbol_shown", "match_answer"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 8;
    return { durationSec: 45, symbolCount: young ? 3 : 5 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "match_answer");
    const correct = answers.filter((a) => a["correct"] === true);
    const times = correct.map((a) => Number(a["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    let streak = 0;
    let maxStreak = 0;
    for (const a of answers) {
      streak = a["correct"] === true ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }
    return {
      correct: correct.length,
      wrong: answers.length - correct.length,
      avgMs: Math.round(mean(times)),
      maxStreak,
      hitsSame: correct.filter((a) => a["wasSame"] === true).length,
      hitsDifferent: correct.filter((a) => a["wasSame"] === false).length,
    };
  },
  score(m) {
    return m.correct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 14, sigma: 6 },
    { age: 8, p50: 18, sigma: 7 },
    { age: 10, p50: 22, sigma: 8 },
    { age: 12, p50: 26, sigma: 8 },
    { age: 14, p50: 29, sigma: 9 },
    { age: 16, p50: 31, sigma: 9 },
    { age: 18, p50: 32, sigma: 9 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrong, successCount: m.correct };
  },
  contributions: { working_memory: 0.25, reaction_speed: 0.2 },
  masteryLevels: { bronze: 24, silver: 32, gold: 42 },
};
