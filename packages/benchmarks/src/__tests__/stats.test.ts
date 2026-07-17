import { describe, expect, it } from "vitest";
import {
  consistency,
  linRegSlope,
  mean,
  median,
  normalCdf,
  percentile,
  seededRandom,
  stdDev,
} from "../utils/stats";

describe("stats", () => {
  it("mean/median básicos", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 100])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(mean([])).toBe(0);
  });

  it("stdDev muestral", () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
    expect(stdDev([5])).toBe(0);
  });

  it("consistency: 1 = perfectamente regular", () => {
    expect(consistency([300, 300, 300])).toBe(1);
    expect(consistency([100, 500, 900])).toBeLessThan(0.5);
  });

  it("percentile interpola", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10, 20], 25)).toBe(12.5);
  });

  it("linRegSlope detecta tendencia", () => {
    expect(linRegSlope([0, 1, 2, 3].map((x) => ({ x, y: 2 * x + 1 })))).toBeCloseTo(2);
    expect(linRegSlope([{ x: 0, y: 5 }])).toBe(0);
  });

  it("normalCdf ≈ valores conocidos", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("seededRandom es determinístico", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
