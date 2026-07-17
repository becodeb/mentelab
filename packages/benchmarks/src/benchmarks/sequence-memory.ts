import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  startLevel: z.number().int().min(1).max(10),
  gridSize: z.number().int().min(2).max(4), // 3 → grilla 3×3
  showMs: z.number().int().min(200).max(1500),
  gapMs: z.number().int().min(50).max(600),
});
export type SequenceMemoryConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  maxLevel: z.number().int(),
  totalClicks: z.number().int(),
  mistakes: z.number().int(),
  avgClickLatencyMs: z.number(),
  /** En qué posición de la secuencia falló (para análisis de span). */
  failPosition: z.number().int().nullable(),
  levelsCompleted: z.number().int(),
});
export type SequenceMemoryMetrics = z.infer<typeof MetricsSchema>;

export const sequenceMemory: BenchmarkDefinition<SequenceMemoryConfig, SequenceMemoryMetrics> = {
  slug: "sequence-memory",
  name: "Memoria de Secuencias",
  shortDescription: "Repetí la secuencia de luces en orden",
  instructions: [
    "Mirá con atención qué casillas se iluminan y en qué orden.",
    "Después tocalas en el mismo orden.",
    "Cada nivel agrega una luz más. ¡Hasta dónde llegás!",
  ],
  icon: "🧩",
  category: "MEMORY",
  minAge: 5,
  unit: "nivel",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["sequence_shown", "cell_click", "level_complete", "sequence_fail"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 7;
    return {
      startLevel: 1,
      gridSize: 3,
      showMs: young ? 700 : 550,
      gapMs: young ? 250 : 180,
    };
  },
  adaptConfig(config, ctx) {
    // Arranca 2 niveles por debajo de su mejor marca: menos repetición trivial.
    if (ctx.bestScore !== null && ctx.bestScore >= 4) {
      return { ...config, startLevel: Math.min(6, Math.floor(ctx.bestScore) - 2) };
    }
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const clicks = eventsOfType(events, "cell_click");
    const completes = eventsOfType(events, "level_complete");
    const fails = eventsOfType(events, "sequence_fail");
    const latencies = clicks
      .map((p) => Number(p["latencyMs"]))
      .filter((v) => Number.isFinite(v) && v >= 0);
    const mistakes = clicks.filter((p) => p["correct"] === false).length;
    const levelsCompleted = completes.length;
    const lastFail = fails[fails.length - 1];
    const startLevel = completes.length
      ? Math.min(...completes.map((p) => Number(p["level"]) || 1))
      : 1;
    // maxLevel = último nivel completado; si no completó ninguno, startLevel - 1 (o 0).
    const maxLevel = completes.length
      ? Math.max(...completes.map((p) => Number(p["level"]) || 0))
      : Math.max(0, startLevel - 1);
    return {
      maxLevel,
      totalClicks: clicks.length,
      mistakes,
      avgClickLatencyMs: Math.round(mean(latencies) * 10) / 10,
      failPosition: lastFail ? Number(lastFail["position"]) || null : null,
      levelsCompleted,
    };
  },
  score(m) {
    return m.maxLevel;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 5, sigma: 2 },
    { age: 8, p50: 6, sigma: 2 },
    { age: 10, p50: 7, sigma: 2.2 },
    { age: 12, p50: 8, sigma: 2.4 },
    { age: 14, p50: 9, sigma: 2.5 },
    { age: 16, p50: 9.5, sigma: 2.5 },
    { age: 18, p50: 10, sigma: 2.5 },
  ],
  summarize(m) {
    return {
      levelReached: m.maxLevel,
      errorCount: m.mistakes,
      successCount: m.totalClicks - m.mistakes,
    };
  },
  contributions: { working_memory: 0.3 },
  masteryLevels: { bronze: 8, silver: 12, gold: 16 },
};
