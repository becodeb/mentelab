import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean } from "../utils/stats";

const ConfigSchema = z.object({
  pairs: z.number().int().min(4).max(12),
});
export type MemoryPairsConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  /** Cantidad de vueltas de a dos cartas hasta completar (score, menor=mejor). */
  moves: z.number().int(),
  matches: z.number().int(),
  avgFlipMs: z.number(),
  /** Eficiencia: pares / movimientos (1 = memoria perfecta). */
  efficiency: z.number(),
  completed: z.boolean(),
});
export type MemoryPairsMetrics = z.infer<typeof MetricsSchema>;

/**
 * PARES — original de MenteLab. El clásico juego de encontrar parejas,
 * instrumentado: cada vuelta de carta queda registrada. Mide memoria
 * espacial de trabajo (recordar dónde estaba cada símbolo).
 */
export const memoryPairs: BenchmarkDefinition<MemoryPairsConfig, MemoryPairsMetrics> = {
  slug: "memory-pairs",
  name: "Pares",
  shortDescription: "Encontrá todas las parejas en la menor cantidad de intentos",
  instructions: [
    "Todas las cartas están boca abajo.",
    "Dá vuelta dos: si son iguales, quedan descubiertas.",
    "Si no, se tapan de nuevo — ¡recordá dónde estaban!",
    "Menos intentos = mejor resultado.",
  ],
  icon: "🃏",
  category: "MEMORY",
  minAge: 5,
  unit: "intentos",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["board_shown", "card_flip", "pair_result"] as const,

  defaultConfigFor(age) {
    if (age !== null && age <= 7) return { pairs: 6 };
    if (age !== null && age <= 12) return { pairs: 8 };
    return { pairs: 10 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const flips = eventsOfType(events, "card_flip");
    const results = eventsOfType(events, "pair_result");
    const matches = results.filter((r) => r["match"] === true).length;
    const boards = eventsOfType(events, "board_shown");
    const totalPairs = boards.length ? Number(boards[0]!["pairs"]) || 0 : 0;
    const flipTimes = flips
      .map((f) => Number(f["ms"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    const moves = results.length;
    return {
      moves,
      matches,
      avgFlipMs: Math.round(mean(flipTimes)),
      efficiency: moves > 0 ? Math.round((matches / moves) * 1000) / 1000 : 0,
      completed: totalPairs > 0 && matches >= totalPairs,
    };
  },
  score(m) {
    return m.moves;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 17, sigma: 5 }, // calibrado a 6 pares
    { age: 8, p50: 22, sigma: 6 }, // 8 pares
    { age: 10, p50: 21, sigma: 5 },
    { age: 12, p50: 20, sigma: 5 },
    { age: 14, p50: 24, sigma: 5 }, // 10 pares
    { age: 16, p50: 23, sigma: 5 },
    { age: 18, p50: 22, sigma: 5 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.moves - m.matches,
      successCount: m.matches,
    };
  },
  contributions: { working_memory: 0.25, visual_attention: 0.2 },
  masteryLevels: { bronze: 24, silver: 19, gold: 15 },
};
