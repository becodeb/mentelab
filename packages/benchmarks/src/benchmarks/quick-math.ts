import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  durationSec: z.number().int().min(30).max(120),
  /** Operando máximo (dificultad por edad). */
  maxOperand: z.number().int().min(5).max(99),
  /** Incluir restas y multiplicaciones simples. */
  advancedOps: z.boolean(),
});
export type QuickMathConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
  avgMs: z.number(),
  maxStreak: z.number().int(),
  /** Latencia media por tipo de operación. */
  avgMsByOp: z.record(z.number()),
});
export type QuickMathMetrics = z.infer<typeof MetricsSchema>;

/**
 * CÁLCULO RELÁMPAGO — original de MenteLab. Sprint de cuentas rápidas con
 * dos opciones de respuesta. Mide velocidad de procesamiento numérico.
 */
export const quickMath: BenchmarkDefinition<QuickMathConfig, QuickMathMetrics> = {
  slug: "quick-math",
  name: "Cálculo Relámpago",
  shortDescription: "Resolvé todas las cuentas que puedas contra el reloj",
  instructions: [
    "Aparece una cuenta con dos posibles resultados.",
    "Tocá el correcto lo más rápido que puedas.",
    "Tenés un minuto. ¡Cada acierto suma!",
  ],
  icon: "➕",
  category: "SPEED",
  minAge: 6,
  unit: "aciertos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["problem_shown", "math_answer"] as const,

  defaultConfigFor(age) {
    if (age !== null && age <= 7) return { durationSec: 60, maxOperand: 10, advancedOps: false };
    if (age !== null && age <= 10) return { durationSec: 60, maxOperand: 20, advancedOps: false };
    if (age !== null && age <= 13) return { durationSec: 60, maxOperand: 50, advancedOps: true };
    return { durationSec: 60, maxOperand: 99, advancedOps: true };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "math_answer");
    const correct = answers.filter((a) => a["correct"] === true);
    const times = correct.map((a) => Number(a["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    let streak = 0;
    let maxStreak = 0;
    const byOp = new Map<string, number[]>();
    for (const a of answers) {
      streak = a["correct"] === true ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
      const op = String(a["op"] ?? "?");
      const ms = Number(a["ms"]);
      if (a["correct"] === true && Number.isFinite(ms)) {
        byOp.set(op, [...(byOp.get(op) ?? []), ms]);
      }
    }
    const avgMsByOp: Record<string, number> = {};
    for (const [op, list] of byOp) avgMsByOp[op] = Math.round(mean(list));
    return {
      correct: correct.length,
      wrong: answers.length - correct.length,
      avgMs: Math.round(mean(times)),
      maxStreak,
      avgMsByOp,
    };
  },
  score(m) {
    return m.correct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 8, sigma: 4 },
    { age: 8, p50: 12, sigma: 5 },
    { age: 10, p50: 15, sigma: 6 },
    { age: 12, p50: 19, sigma: 7 },
    { age: 14, p50: 22, sigma: 8 },
    { age: 16, p50: 25, sigma: 8 },
    { age: 18, p50: 26, sigma: 8 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrong, successCount: m.correct };
  },
  contributions: { working_memory: 0.2, reaction_speed: 0.15 },
  masteryLevels: { bronze: 18, silver: 26, gold: 36 },
};
