import type { ZodType } from "zod";
import type {
  AttemptEvent,
  BenchmarkCategory,
  CognitiveIndicator,
} from "@mentelab/shared";

export type ScoreDirection = "higher_better" | "lower_better";

/** Curva de referencia por edad para normalizar a 0-100 (marcada "beta" hasta
 *  tener masa crítica de datos propios — doc 05 §4). */
export interface AgeReferencePoint {
  age: number;
  p50: number;
  sigma: number;
}

/** Umbrales de las insignias de maestría (familia 🏆) sobre el score canónico. */
export interface MasteryLevels {
  bronze: number;
  silver: number;
  gold: number;
}

/** Estadísticas del jugador que la API pasa para adaptar la dificultad. */
export interface PlayerBenchmarkContext {
  bestScore: number | null;
  avg30d: number | null;
  totalAttempts: number;
}

/**
 * Contrato de un benchmark. Agregar un juego nuevo = implementar esto y
 * registrarlo en `registry.ts`. Cero cambios en DB, API o infraestructura.
 * Toda la lógica es PURA: corre idéntica en el cliente (feedback inmediato)
 * y en el servidor (recomputo oficial sobre los eventos crudos).
 */
export interface BenchmarkDefinition<TConfig = unknown, TMetrics = unknown> {
  slug: string;
  name: string;
  shortDescription: string;
  /** Instrucciones para el alumno, frases cortas y simples. */
  instructions: string[];
  icon: string; // emoji
  category: BenchmarkCategory;
  minAge: number;
  unit: string; // "ms" | "nivel" | "dígitos" | "palabras" | "PPM"...

  configSchema: ZodType<TConfig>;
  metricsSchema: ZodType<TMetrics>;
  /** Tipos de evento propios del juego (además de los comunes del GameShell). */
  eventTypes: readonly string[];

  /** Dificultad base según edad (null = invitado adulto por defecto). */
  defaultConfigFor(age: number | null): TConfig;
  /** Ajuste fino con el historial del jugador (arrancar cerca de su nivel). */
  adaptConfig(config: TConfig, ctx: PlayerBenchmarkContext): TConfig;

  /** Métricas resumen desde los eventos crudos. PURA y determinística. */
  computeMetrics(events: AttemptEvent[], config: TConfig): TMetrics;
  /** Score canónico (comparable y rankeable) desde las métricas. */
  score(metrics: TMetrics): number;
  scoreDirection: ScoreDirection;
  /** Normalización 0-100 ajustada por edad, para perfil cognitivo. */
  ageReference: AgeReferencePoint[];

  /** Nivel/errores/aciertos promovidos a columnas de `attempts`. */
  summarize(metrics: TMetrics): {
    levelReached: number | null;
    errorCount: number;
    successCount: number;
  };

  /** Contribución a los indicadores del perfil cognitivo (doc 05 §4). */
  contributions: Partial<Record<CognitiveIndicator, number>>;
  masteryLevels: MasteryLevels;
}

/** Extrae los payloads de un tipo de evento dado, en orden de seq. */
export function eventsOfType(events: AttemptEvent[], type: string): Record<string, unknown>[] {
  return events
    .filter((e) => e.type === type)
    .sort((a, b) => a.seq - b.seq)
    .map((e) => e.payload ?? {});
}
