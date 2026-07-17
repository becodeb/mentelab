import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean, stdDev } from "../utils/stats";

const ConfigSchema = z.object({
  bpm: z.number().int().min(50).max(140),
  /** Beats de guía con metrónomo antes de quedarte solo. */
  guideBeats: z.number().int().min(4).max(16),
  /** Beats a mantener en silencio (lo que se mide). */
  silentBeats: z.number().int().min(8).max(32),
});
export type RhythmKeeperConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  /** Desvío absoluto medio del beat (score, menor = mejor). */
  avgAbsOffsetMs: z.number(),
  stdDevOffsetMs: z.number(),
  /** Sesgo: negativo = te adelantás, positivo = te atrasás. */
  meanOffsetMs: z.number(),
  tapsOnBeat: z.number().int(),
  tapsMissed: z.number().int(),
  extraTaps: z.number().int(),
});
export type RhythmKeeperMetrics = z.infer<typeof MetricsSchema>;

/**
 * RITMO — original de MenteLab. El metrónomo marca el pulso y después se
 * calla: hay que seguir tocando al mismo ritmo, de memoria motora.
 * Habilidad pura: timing interno y regularidad.
 */
export const rhythmKeeper: BenchmarkDefinition<RhythmKeeperConfig, RhythmKeeperMetrics> = {
  slug: "rhythm-keeper",
  name: "Ritmo",
  shortDescription: "Seguí el pulso… incluso cuando el metrónomo se calla",
  instructions: [
    "Escuchá y mirá el pulso del tambor.",
    "Tocá junto con cada golpe.",
    "Cuando el tambor se calle, ¡seguí vos con el mismo ritmo!",
    "Cuanto más exacto, mejor.",
  ],
  icon: "🥁",
  category: "PRECISION",
  minAge: 6,
  unit: "ms",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["beat", "rhythm_tap"] as const,

  defaultConfigFor(age) {
    const young = age !== null && age <= 8;
    return { bpm: young ? 70 : 80, guideBeats: 8, silentBeats: young ? 10 : 14 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[], config) {
    // Solo cuentan los taps de la fase silenciosa (beatIndex >= guideBeats).
    const taps = eventsOfType(events, "rhythm_tap").filter(
      (t) => Number(t["beatIndex"]) >= config.guideBeats,
    );
    const matched = taps.filter((t) => t["matched"] === true);
    const offsets = matched
      .map((t) => Number(t["offsetMs"]))
      .filter((v) => Number.isFinite(v));
    const absOffsets = offsets.map(Math.abs);
    const tapsOnBeat = matched.length;
    return {
      avgAbsOffsetMs: Math.round(mean(absOffsets)),
      stdDevOffsetMs: Math.round(stdDev(offsets)),
      meanOffsetMs: Math.round(mean(offsets)),
      tapsOnBeat,
      tapsMissed: Math.max(0, config.silentBeats - tapsOnBeat),
      extraTaps: taps.length - tapsOnBeat,
    };
  },
  score(m) {
    // Sin taps válidos = peor puntaje posible acotado.
    return m.tapsOnBeat === 0 ? 500 : m.avgAbsOffsetMs;
  },
  scoreDirection: "lower_better",
  ageReference: [
    { age: 6, p50: 150, sigma: 55 },
    { age: 8, p50: 130, sigma: 50 },
    { age: 10, p50: 110, sigma: 45 },
    { age: 12, p50: 100, sigma: 40 },
    { age: 14, p50: 90, sigma: 38 },
    { age: 16, p50: 82, sigma: 35 },
    { age: 18, p50: 80, sigma: 35 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.tapsMissed + m.extraTaps,
      successCount: m.tapsOnBeat,
    };
  },
  contributions: { precision: 0.25, reaction_speed: 0.1 },
  masteryLevels: { bronze: 110, silver: 75, gold: 50 },
};
