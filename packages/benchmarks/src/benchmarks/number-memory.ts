import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  startDigits: z.number().int().min(1).max(8),
  showMsPerDigit: z.number().int().min(400).max(2000),
});
export type NumberMemoryConfig = z.infer<typeof ConfigSchema>;

const ErrorKind = z.enum(["transposition", "omission", "substitution", "extra"]);

const MetricsSchema = z.object({
  maxDigits: z.number().int(),
  roundsPlayed: z.number().int(),
  avgMemorizeMs: z.number(),
  avgTypeMs: z.number(),
  /** Clasificación del error final (análisis del tipo de fallo de memoria). */
  finalErrorKind: ErrorKind.nullable(),
  correctRounds: z.number().int(),
});
export type NumberMemoryMetrics = z.infer<typeof MetricsSchema>;

/** Clasifica el tipo de error comparando respuesta y número mostrado. */
export function classifyDigitError(
  shown: string,
  answer: string,
): z.infer<typeof ErrorKind> | null {
  if (shown === answer) return null;
  if (answer.length < shown.length) return "omission";
  if (answer.length > shown.length) return "extra";
  // misma longitud: ¿es una transposición de dígitos adyacentes?
  for (let i = 0; i < shown.length - 1; i++) {
    const swapped = shown.slice(0, i) + shown[i + 1] + shown[i] + shown.slice(i + 2);
    if (swapped === answer) return "transposition";
  }
  return "substitution";
}

export const numberMemory: BenchmarkDefinition<NumberMemoryConfig, NumberMemoryMetrics> = {
  slug: "number-memory",
  name: "Memoria de Números",
  shortDescription: "Memorizá el número antes de que desaparezca",
  instructions: [
    "Vas a ver un número por unos segundos. ¡Memorizalo!",
    "Cuando desaparezca, escribilo.",
    "Cada ronda tiene un dígito más. ¿Cuántos aguantás?",
  ],
  icon: "🔢",
  category: "MEMORY",
  minAge: 6,
  unit: "dígitos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["number_shown", "answer_submitted"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return { startDigits: young ? 2 : 3, showMsPerDigit: young ? 1300 : 1000 };
  },
  adaptConfig(config, ctx) {
    if (ctx.bestScore !== null && ctx.bestScore >= 4) {
      return { ...config, startDigits: Math.min(6, Math.floor(ctx.bestScore) - 1) };
    }
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "answer_submitted");
    const correct = answers.filter((p) => p["correct"] === true);
    const memorizeTimes = answers
      .map((p) => Number(p["memorizeMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const typeTimes = answers
      .map((p) => Number(p["typeMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const maxDigits = correct.length
      ? Math.max(...correct.map((p) => String(p["shown"] ?? "").length))
      : 0;
    const last = answers[answers.length - 1];
    const finalErrorKind =
      last && last["correct"] === false
        ? classifyDigitError(String(last["shown"] ?? ""), String(last["answer"] ?? ""))
        : null;
    return {
      maxDigits,
      roundsPlayed: answers.length,
      avgMemorizeMs: Math.round(mean(memorizeTimes)),
      avgTypeMs: Math.round(mean(typeTimes)),
      finalErrorKind,
      correctRounds: correct.length,
    };
  },
  score(m) {
    return m.maxDigits;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 4.5, sigma: 1.5 },
    { age: 8, p50: 5.5, sigma: 1.5 },
    { age: 10, p50: 6.5, sigma: 1.6 },
    { age: 12, p50: 7, sigma: 1.7 },
    { age: 14, p50: 7.5, sigma: 1.8 },
    { age: 16, p50: 8, sigma: 1.8 },
    { age: 18, p50: 8, sigma: 1.8 },
  ],
  summarize(m) {
    return {
      levelReached: m.maxDigits,
      errorCount: m.roundsPlayed - m.correctRounds,
      successCount: m.correctRounds,
    };
  },
  contributions: { working_memory: 0.35 },
  masteryLevels: { bronze: 7, silver: 9, gold: 11 },
};
