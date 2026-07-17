import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  rounds: z.number().int().min(5).max(15),
  /** Velocidad inicial (recorridos de la barra por segundo). */
  startSpeed: z.number().min(0.4).max(1.2),
  /** Incremento de velocidad por ronda. */
  speedStep: z.number().min(0.05).max(0.3),
});
export type PerfectStopConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  /** Distancia media al centro en % del recorrido (score, menor = mejor). */
  avgDistPct: z.number(),
  bestDistPct: z.number(),
  worstDistPct: z.number(),
  /** Frenadas "perfectas" (≤3% del centro). */
  perfectStops: z.number().int(),
  roundsPlayed: z.number().int(),
  /** Precisión a la velocidad más alta jugada. */
  distAtMaxSpeedPct: z.number().nullable(),
});
export type PerfectStopMetrics = z.infer<typeof MetricsSchema>;

/**
 * FRENADA PERFECTA — original de MenteLab. Un marcador barre la pista cada
 * vez más rápido: hay que frenarlo en el centro exacto. Coordinación
 * ojo-mano y anticipación pura.
 */
export const perfectStop: BenchmarkDefinition<PerfectStopConfig, PerfectStopMetrics> = {
  slug: "perfect-stop",
  name: "Frenada Perfecta",
  shortDescription: "Frená el marcador justo en el centro",
  instructions: [
    "El marcador va y viene por la pista.",
    "Tocá para frenarlo lo más cerca del centro que puedas.",
    "Cada ronda va más rápido. ¡Anticipate!",
  ],
  icon: "🎚️",
  category: "PRECISION",
  minAge: 5,
  unit: "%",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["round_start", "stop"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return { rounds: 8, startSpeed: young ? 0.5 : 0.65, speedStep: young ? 0.08 : 0.12 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const stops = eventsOfType(events, "stop");
    const dists = stops
      .map((s) => Number(s["distPct"]))
      .filter((v) => Number.isFinite(v) && v >= 0);
    const bySpeed = stops
      .map((s) => ({ speed: Number(s["speed"]), dist: Number(s["distPct"]) }))
      .filter((s) => Number.isFinite(s.speed) && Number.isFinite(s.dist))
      .sort((a, b) => b.speed - a.speed);
    return {
      avgDistPct: Math.round(mean(dists) * 10) / 10,
      bestDistPct: dists.length ? Math.round(Math.min(...dists) * 10) / 10 : 0,
      worstDistPct: dists.length ? Math.round(Math.max(...dists) * 10) / 10 : 0,
      perfectStops: dists.filter((d) => d <= 3).length,
      roundsPlayed: stops.length,
      distAtMaxSpeedPct: bySpeed.length ? Math.round(bySpeed[0]!.dist * 10) / 10 : null,
    };
  },
  score(m) {
    return m.roundsPlayed === 0 ? 50 : m.avgDistPct;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 18, sigma: 6 },
    { age: 8, p50: 15, sigma: 5.5 },
    { age: 10, p50: 13, sigma: 5 },
    { age: 12, p50: 11, sigma: 4.5 },
    { age: 14, p50: 10, sigma: 4 },
    { age: 16, p50: 9, sigma: 4 },
    { age: 18, p50: 9, sigma: 4 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.roundsPlayed - m.perfectStops,
      successCount: m.perfectStops,
    };
  },
  contributions: { precision: 0.3, reaction_speed: 0.15 },
  masteryLevels: { bronze: 12, silver: 8, gold: 5 },
};
