import type { BenchmarkDefinition } from "./types";
import { reactionTime } from "./benchmarks/reaction-time";
import { sequenceMemory } from "./benchmarks/sequence-memory";
import { aimTrainer } from "./benchmarks/aim-trainer";
import { numberMemory } from "./benchmarks/number-memory";
import { verbalMemory } from "./benchmarks/verbal-memory";
import { chimpTest } from "./benchmarks/chimp-test";
import { visualMemory } from "./benchmarks/visual-memory";
import { typingTest } from "./benchmarks/typing-test";

/**
 * Registro central de benchmarks. Para agregar uno nuevo:
 * 1. Crear `src/benchmarks/<slug>.ts` implementando BenchmarkDefinition.
 * 2. Agregarlo acá.
 * 3. Crear su componente de juego en `apps/web/src/benchmarks/<slug>/`.
 * Nada más: DB, API, rankings, gamificación y perfil cognitivo lo toman solos.
 */
const ALL: BenchmarkDefinition<unknown, unknown>[] = [
  reactionTime,
  sequenceMemory,
  aimTrainer,
  numberMemory,
  verbalMemory,
  chimpTest,
  visualMemory,
  typingTest,
] as BenchmarkDefinition<unknown, unknown>[];

export const benchmarkRegistry: ReadonlyMap<string, BenchmarkDefinition<unknown, unknown>> =
  new Map(ALL.map((b) => [b.slug, b]));

export const BENCHMARK_SLUGS = ALL.map((b) => b.slug);

export function getBenchmark(slug: string): BenchmarkDefinition<unknown, unknown> {
  const def = benchmarkRegistry.get(slug);
  if (!def) throw new Error(`Benchmark desconocido: ${slug}`);
  return def;
}

/** Catálogo serializable para GET /v1/benchmarks y el hub del frontend. */
export function serializeCatalog() {
  return ALL.map((b) => ({
    slug: b.slug,
    name: b.name,
    shortDescription: b.shortDescription,
    instructions: b.instructions,
    icon: b.icon,
    category: b.category,
    minAge: b.minAge,
    unit: b.unit,
    scoreDirection: b.scoreDirection,
  }));
}
export type BenchmarkCatalogEntry = ReturnType<typeof serializeCatalog>[number];
