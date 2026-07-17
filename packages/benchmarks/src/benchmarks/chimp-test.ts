import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  startCount: z.number().int().min(3).max(8),
  strikesAllowed: z.number().int().min(1).max(5),
});
export type ChimpTestConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  /** Máxima cantidad de números completada correctamente. */
  maxNumbers: z.number().int(),
  strikes: z.number().int(),
  totalClicks: z.number().int(),
  correctClicks: z.number().int(),
  avgClickLatencyMs: z.number(),
  /** Latencia media del primer click de cada tablero (tiempo de "fotografía"). */
  avgFirstClickMs: z.number(),
  boardsPlayed: z.number().int(),
});
export type ChimpTestMetrics = z.infer<typeof MetricsSchema>;

export const chimpTest: BenchmarkDefinition<ChimpTestConfig, ChimpTestMetrics> = {
  slug: "chimp-test",
  name: "Desafío Chimpancé",
  shortDescription: "Memorizá dónde están los números y tocalos en orden",
  instructions: [
    "Vas a ver números repartidos en la pantalla.",
    "Tocá el 1 y los demás se tapan.",
    "Seguí tocando en orden: 2, 3, 4… ¡de memoria!",
    "Cada tablero correcto agrega un número más.",
  ],
  icon: "🐵",
  category: "MEMORY",
  minAge: 6,
  unit: "números",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["board_shown", "tile_click", "board_complete", "strike"] as const,

  defaultConfigFor(age) {
    return { startCount: age !== null && age <= 7 ? 3 : 4, strikesAllowed: 3 };
  },
  adaptConfig(config, ctx) {
    if (ctx.bestScore !== null && ctx.bestScore >= 6) {
      return { ...config, startCount: Math.min(7, Math.floor(ctx.bestScore) - 2) };
    }
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const clicks = eventsOfType(events, "tile_click");
    const completes = eventsOfType(events, "board_complete");
    const boards = eventsOfType(events, "board_shown");
    const correct = clicks.filter((p) => p["correct"] === true);
    const latencies = clicks
      .map((p) => Number(p["latencyMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const firstClicks = clicks
      .filter((p) => Number(p["ordinal"]) === 1)
      .map((p) => Number(p["latencyMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const maxNumbers = completes.length
      ? Math.max(...completes.map((p) => Number(p["count"]) || 0))
      : 0;
    return {
      maxNumbers,
      strikes: eventsOfType(events, "strike").length,
      totalClicks: clicks.length,
      correctClicks: correct.length,
      avgClickLatencyMs: Math.round(mean(latencies)),
      avgFirstClickMs: Math.round(mean(firstClicks)),
      boardsPlayed: boards.length,
    };
  },
  score(m) {
    return m.maxNumbers;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 5, sigma: 1.8 },
    { age: 8, p50: 6, sigma: 2 },
    { age: 10, p50: 7, sigma: 2.2 },
    { age: 12, p50: 8, sigma: 2.3 },
    { age: 14, p50: 9, sigma: 2.4 },
    { age: 16, p50: 9.5, sigma: 2.4 },
    { age: 18, p50: 10, sigma: 2.5 },
  ],
  summarize(m) {
    return {
      levelReached: m.maxNumbers,
      errorCount: m.strikes,
      successCount: m.correctClicks,
    };
  },
  contributions: { working_memory: 0.35, visual_attention: 0.3 },
  masteryLevels: { bronze: 8, silver: 11, gold: 14 },
};
