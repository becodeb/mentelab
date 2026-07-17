import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean, stdDev } from "../utils/stats";

/** Textos apropiados por franja etaria (español rioplatense, sin caracteres raros). */
export const TYPING_TEXTS: Record<"young" | "mid" | "teen", string[]> = {
  young: [
    "el sol sale cada mañana y los pájaros cantan en los árboles del parque",
    "mi perro corre feliz por el pasto y salta muy alto para atrapar la pelota",
    "en verano vamos al río con mi familia y juntamos piedras de colores",
  ],
  mid: [
    "los planetas giran alrededor del sol en un baile que dura miles de años y nunca se detiene",
    "la biblioteca de la escuela guarda historias de piratas dragones y mundos por descubrir",
    "el explorador cruzó la montaña con su mochila llena de mapas brújulas y mucha curiosidad",
  ],
  teen: [
    "la ciencia avanza cuando alguien se anima a preguntar por qué las cosas funcionan de esa manera y no se conforma con la primera respuesta",
    "cada persona aprende a su propio ritmo y la práctica constante logra más que el talento que no se entrena nunca",
    "los grandes inventos de la historia empezaron casi siempre como ideas simples que alguien tuvo la paciencia de mejorar día tras día",
  ],
};

const ConfigSchema = z.object({
  durationSec: z.number().int().min(15).max(120),
  textBand: z.enum(["young", "mid", "teen"]),
  textIndex: z.number().int().min(0).max(10),
});
export type TypingTestConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  grossWpm: z.number(),
  netWpm: z.number(),
  accuracy: z.number(),
  keystrokes: z.number().int(),
  errors: z.number().int(),
  backspaces: z.number().int(),
  avgInterKeyMs: z.number(),
  /** Desvío del intervalo entre teclas: menor = ritmo más parejo. */
  rhythmStdDevMs: z.number(),
  charsTyped: z.number().int(),
});
export type TypingTestMetrics = z.infer<typeof MetricsSchema>;

export const typingTest: BenchmarkDefinition<TypingTestConfig, TypingTestMetrics> = {
  slug: "typing-test",
  name: "Velocidad de Tipeo",
  shortDescription: "Escribí el texto lo más rápido y preciso que puedas",
  instructions: [
    "Escribí el texto que aparece en pantalla.",
    "Las letras correctas se ponen verdes; las incorrectas, naranjas.",
    "Tenés un minuto. ¡Velocidad y precisión!",
  ],
  icon: "⌨️",
  category: "TYPING",
  minAge: 7,
  unit: "PPM",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["keystroke", "typing_done"] as const,

  defaultConfigFor(age) {
    const band = age === null ? "teen" : age <= 8 ? "young" : age <= 12 ? "mid" : "teen";
    return { durationSec: 60, textBand: band, textIndex: 0 };
  },
  adaptConfig(config, ctx) {
    // Rota el texto para que no memoricen uno solo.
    return { ...config, textIndex: ctx.totalAttempts % 3 };
  },

  computeMetrics(events: AttemptEvent[], config) {
    const keys = eventsOfType(events, "keystroke");
    const typed = keys.filter((p) => p["kind"] !== "backspace");
    const correct = typed.filter((p) => p["correct"] === true).length;
    const errors = typed.length - correct;
    const backspaces = keys.filter((p) => p["kind"] === "backspace").length;
    const sorted = events
      .filter((e) => e.type === "keystroke")
      .sort((a, b) => a.seq - b.seq);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i]!.tMs - sorted[i - 1]!.tMs;
      if (dt > 0 && dt < 5000) intervals.push(dt);
    }
    const minutes = config.durationSec / 60;
    // Convención estándar: 1 palabra = 5 caracteres.
    const grossWpm = typed.length / 5 / minutes;
    const netWpm = Math.max(0, correct / 5 / minutes);
    return {
      grossWpm: Math.round(grossWpm * 10) / 10,
      netWpm: Math.round(netWpm * 10) / 10,
      accuracy: typed.length ? Math.round((correct / typed.length) * 1000) / 1000 : 0,
      keystrokes: keys.length,
      errors,
      backspaces,
      avgInterKeyMs: Math.round(mean(intervals)),
      rhythmStdDevMs: Math.round(stdDev(intervals)),
      charsTyped: typed.length,
    };
  },
  score(m) {
    return m.netWpm;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 8, sigma: 5 },
    { age: 8, p50: 15, sigma: 8 },
    { age: 10, p50: 22, sigma: 10 },
    { age: 12, p50: 30, sigma: 11 },
    { age: 14, p50: 38, sigma: 12 },
    { age: 16, p50: 45, sigma: 13 },
    { age: 18, p50: 50, sigma: 14 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.errors,
      successCount: m.charsTyped - m.errors,
    };
  },
  contributions: { typing_speed: 1.0, precision: 0.3 },
  masteryLevels: { bronze: 25, silver: 40, gold: 60 },
};
