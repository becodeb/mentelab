import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";

const ConfigSchema = z.object({
  /** Cantidad de nodos a unir. */
  nodes: z.number().int().min(6).max(16),
  /** true = alternar 1-A-2-B… (más difícil); false = solo números. */
  alternating: z.boolean(),
});
export type TrailPathConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  totalMs: z.number(),
  /** ms promedio por nodo (score, menor = mejor). */
  avgMsPerNode: z.number(),
  wrongTaps: z.number().int(),
  nodesCompleted: z.number().int(),
});
export type TrailPathMetrics = z.infer<typeof MetricsSchema>;

/**
 * UNÍ EL CAMINO (trail making) — clásico de función ejecutiva: tocar los
 * nodos en orden; en modo alternado hay que cambiar de serie (1-A-2-B…),
 * lo que mide flexibilidad cognitiva.
 */
export const trailPath: BenchmarkDefinition<TrailPathConfig, TrailPathMetrics> = {
  slug: "trail-path",
  name: "Uní el Camino",
  shortDescription: "Conectá los puntos en orden sin perderte",
  instructions: [
    "Los puntos están desparramados por la pantalla.",
    "Tocalos en orden para dibujar el camino.",
    "Si hay letras, alterná: 1, A, 2, B, 3, C…",
  ],
  icon: "🧵",
  category: "ATTENTION",
  minAge: 6,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["trail_shown", "node_tap"] as const,

  defaultConfigFor(age) {
    if (age !== null && age <= 7) return { nodes: 8, alternating: false };
    if (age !== null && age <= 11) return { nodes: 10, alternating: true };
    return { nodes: 14, alternating: true };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const taps = eventsOfType(events, "node_tap");
    const correct = taps.filter((t) => t["correct"] === true);
    const times = correct.map((t) => Number(t["ms"])).filter((v) => Number.isFinite(v) && v > 0);
    const totalMs = times.length ? Math.max(...times) : 0;
    return {
      totalMs: Math.round(totalMs),
      avgMsPerNode: correct.length ? Math.round(totalMs / correct.length) : 0,
      wrongTaps: taps.length - correct.length,
      nodesCompleted: correct.length,
    };
  },
  score(m) {
    return m.nodesCompleted === 0 ? 10_000 : m.avgMsPerNode;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 3200, sigma: 1000 },
    { age: 8, p50: 2800, sigma: 900 },
    { age: 10, p50: 2400, sigma: 750 },
    { age: 12, p50: 2100, sigma: 700 },
    { age: 14, p50: 1900, sigma: 600 },
    { age: 16, p50: 1800, sigma: 550 },
    { age: 18, p50: 1750, sigma: 550 },
  ],
  summarize(m) {
    return { levelReached: null, errorCount: m.wrongTaps, successCount: m.nodesCompleted };
  },
  contributions: { visual_attention: 0.3, working_memory: 0.15 },
  masteryLevels: { bronze: 2200, silver: 1600, gold: 1200 },
};
