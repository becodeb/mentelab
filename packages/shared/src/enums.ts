import { z } from "zod";

/** Tipo de jugador: alumno de institución o invitado del Modo Libre. */
export const PlayerType = z.enum(["STUDENT", "GUEST"]);
export type PlayerType = z.infer<typeof PlayerType>;

export const StaffRole = z.enum(["TEACHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]);
export type StaffRole = z.infer<typeof StaffRole>;

export const Gender = z.enum(["F", "M", "X"]);
export type Gender = z.infer<typeof Gender>;

/** Mecanismo de clave simple del alumno. */
export const SecretType = z.enum(["PIN4", "PICTURE"]);
export type SecretType = z.infer<typeof SecretType>;

export const AttemptStatus = z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED", "INVALID"]);
export type AttemptStatus = z.infer<typeof AttemptStatus>;

/** Separación estructural institucional / Modo Libre. Nunca se mezclan. */
export const DataScope = z.enum(["INSTITUTIONAL", "GLOBAL"]);
export type DataScope = z.infer<typeof DataScope>;

export const BenchmarkCategory = z.enum(["SPEED", "MEMORY", "ATTENTION", "PRECISION", "TYPING"]);
export type BenchmarkCategory = z.infer<typeof BenchmarkCategory>;

/** Los 8 indicadores del perfil cognitivo (doc 05 §4). */
export const CognitiveIndicator = z.enum([
  "reaction_speed",
  "working_memory",
  "visual_attention",
  "precision",
  "typing_speed",
  "consistency",
  "improvement",
  "training_constancy",
]);
export type CognitiveIndicator = z.infer<typeof CognitiveIndicator>;

export const COGNITIVE_INDICATOR_LABELS: Record<
  CognitiveIndicator,
  { label: string; emoji: string }
> = {
  reaction_speed: { label: "Velocidad de reacción", emoji: "⚡" },
  working_memory: { label: "Memoria de trabajo", emoji: "🧠" },
  visual_attention: { label: "Atención visual", emoji: "👀" },
  precision: { label: "Precisión", emoji: "🎯" },
  typing_speed: { label: "Velocidad de escritura", emoji: "⌨️" },
  consistency: { label: "Consistencia", emoji: "📈" },
  improvement: { label: "Capacidad de mejora", emoji: "🚀" },
  training_constancy: { label: "Constancia", emoji: "🔥" },
};

/** Alcance de un ranking. */
export const LeaderboardScope = z.enum(["classroom", "grade", "age", "institution", "global"]);
export type LeaderboardScope = z.infer<typeof LeaderboardScope>;

export const LeaderboardPeriod = z.enum(["today", "7d", "30d", "year", "all"]);
export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriod>;

/** Métrica de ordenamiento de rankings (doc 06 §2). */
export const RankingMetric = z.enum(["best", "avg", "consistency", "count", "progress"]);
export type RankingMetric = z.infer<typeof RankingMetric>;
