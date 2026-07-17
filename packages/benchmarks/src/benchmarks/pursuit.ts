import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  durationSec: z.number().int().min(15).max(60),
  /** Radio del objetivo en px (más chico = más difícil). */
  targetRadiusPx: z.number().int().min(24).max(80),
  /** Velocidad del recorrido (ciclos por minuto de la curva). */
  speed: z.number().min(2).max(10),
});
export type PursuitConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  /** % del tiempo con el puntero sobre el objetivo (score, mayor = mejor). */
  timeOnTargetPct: z.number(),
  avgDistPx: z.number(),
  samples: z.number().int(),
  /** Racha más larga de muestras consecutivas sobre el objetivo. */
  longestOnStreak: z.number().int(),
});
export type PursuitMetrics = z.infer<typeof MetricsSchema>;

/**
 * PERSECUCIÓN — original de MenteLab. Un objetivo se mueve en curvas
 * suaves: hay que mantener el dedo (o el mouse) encima todo el tiempo.
 * Seguimiento motor fino continuo, imposible de "adivinar".
 */
export const pursuit: BenchmarkDefinition<PursuitConfig, PursuitMetrics> = {
  slug: "pursuit",
  name: "Persecución",
  shortDescription: "No dejes escapar al objetivo: seguilo sin soltarlo",
  instructions: [
    "El círculo se mueve todo el tiempo.",
    "Mantené el dedo (o el mouse) encima.",
    "Cada instante que lo sigas suma. ¡Treinta segundos de pulso firme!",
  ],
  icon: "🛸",
  category: "PRECISION",
  minAge: 5,
  unit: "%",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["track_sample"] as const,

  defaultConfigFor(age) {
    // Calibrado para primaria: lento y con objetivo grande; el desafío
    // escala recién en secundaria.
    if (age !== null && age <= 7) return { durationSec: 20, targetRadiusPx: 80, speed: 2 };
    if (age !== null && age <= 11) return { durationSec: 25, targetRadiusPx: 66, speed: 2.6 };
    return { durationSec: 30, targetRadiusPx: 52, speed: 3.4 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const samples = eventsOfType(events, "track_sample");
    const on = samples.filter((s) => s["on"] === true).length;
    const dists = samples
      .map((s) => Number(s["dist"]))
      .filter((v) => Number.isFinite(v) && v >= 0);
    let streak = 0;
    let longest = 0;
    for (const s of samples) {
      streak = s["on"] === true ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }
    return {
      timeOnTargetPct: samples.length
        ? Math.round((on / samples.length) * 1000) / 10
        : 0,
      avgDistPx: Math.round(mean(dists)),
      samples: samples.length,
      longestOnStreak: longest,
    };
  },
  score(m) {
    return m.timeOnTargetPct;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 38, sigma: 16 },
    { age: 8, p50: 45, sigma: 16 },
    { age: 10, p50: 52, sigma: 15 },
    { age: 12, p50: 58, sigma: 15 },
    { age: 14, p50: 63, sigma: 14 },
    { age: 16, p50: 67, sigma: 14 },
    { age: 18, p50: 68, sigma: 14 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.samples - Math.round((m.timeOnTargetPct / 100) * m.samples),
      successCount: Math.round((m.timeOnTargetPct / 100) * m.samples),
    };
  },
  contributions: { precision: 0.3, visual_attention: 0.2 },
  masteryLevels: { bronze: 55, silver: 70, gold: 85 },
};
