import { normalCdf } from "./utils/stats";
import type { AgeReferencePoint, ScoreDirection } from "./types";

/** Interpola la referencia (p50, sigma) para una edad dada. */
export function referenceForAge(
  refs: AgeReferencePoint[],
  age: number | null,
): { p50: number; sigma: number } {
  const sorted = [...refs].sort((a, b) => a.age - b.age);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) throw new Error("ageReference vacío");
  // Invitados sin edad: referencia adulta (la más alta de la curva).
  const a = age === null ? last.age : Math.max(first.age, Math.min(last.age, age));
  let lo = first;
  let hi = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!;
    const nxt = sorted[i + 1]!;
    if (a >= cur.age && a <= nxt.age) {
      lo = cur;
      hi = nxt;
      break;
    }
  }
  if (lo.age === hi.age) return { p50: lo.p50, sigma: lo.sigma };
  const t = (a - lo.age) / (hi.age - lo.age);
  return { p50: lo.p50 + t * (hi.p50 - lo.p50), sigma: lo.sigma + t * (hi.sigma - lo.sigma) };
}

/**
 * Score crudo → 0-100 relativo a la banda etaria.
 * 50 = mediana esperada para la edad; la escala es la CDF normal.
 */
export function normalizeScore(
  score: number,
  age: number | null,
  refs: AgeReferencePoint[],
  direction: ScoreDirection,
): number {
  const { p50, sigma } = referenceForAge(refs, age);
  if (sigma <= 0) return 50;
  const z = direction === "higher_better" ? (score - p50) / sigma : (p50 - score) / sigma;
  return Math.round(normalCdf(z) * 1000) / 10; // un decimal
}
