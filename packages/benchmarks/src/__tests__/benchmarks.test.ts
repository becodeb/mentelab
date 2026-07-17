import { describe, expect, it } from "vitest";
import { BENCHMARK_SLUGS, benchmarkRegistry, serializeCatalog } from "../registry";
import { classifyDigitError } from "../benchmarks/number-memory";
import { typingTest } from "../benchmarks/typing-test";
import type { AttemptEvent } from "@mentelab/shared";

describe("registry", () => {
  it("tiene los 8 benchmarks del diseño + los 4 originales", () => {
    expect(BENCHMARK_SLUGS).toEqual([
      "reaction-time",
      "sequence-memory",
      "aim-trainer",
      "number-memory",
      "verbal-memory",
      "chimp-test",
      "visual-memory",
      "typing-test",
      "odd-one-out",
      "color-trap",
      "quick-math",
      "memory-pairs",
    ]);
  });

  it("cada definición es internamente consistente", () => {
    for (const def of benchmarkRegistry.values()) {
      // La config por defecto valida contra su propio schema (toda edad).
      for (const age of [6, 10, 14, null]) {
        expect(() => def.configSchema.parse(def.defaultConfigFor(age))).not.toThrow();
      }
      // Referencias de edad ordenadas y con sigma positivo.
      const ages = def.ageReference.map((r) => r.age);
      expect([...ages].sort((a, b) => a - b)).toEqual(ages);
      expect(def.ageReference.every((r) => r.sigma > 0)).toBe(true);
      // Maestría coherente con la dirección del score.
      const { bronze, silver, gold } = def.masteryLevels;
      if (def.scoreDirection === "higher_better") {
        expect(bronze).toBeLessThan(silver);
        expect(silver).toBeLessThan(gold);
      } else {
        expect(bronze).toBeGreaterThan(silver);
        expect(silver).toBeGreaterThan(gold);
      }
      // Contribuciones al perfil en rango 0..1.
      for (const w of Object.values(def.contributions)) {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it("el catálogo serializa sin funciones", () => {
    const cat = serializeCatalog();
    expect(cat).toHaveLength(12);
    expect(JSON.parse(JSON.stringify(cat))).toEqual(cat);
  });
});

describe("number-memory: clasificación de errores", () => {
  it("distingue transposición, omisión, sustitución y extra", () => {
    expect(classifyDigitError("1234", "1234")).toBeNull();
    expect(classifyDigitError("1234", "1243")).toBe("transposition");
    expect(classifyDigitError("1234", "123")).toBe("omission");
    expect(classifyDigitError("1234", "12345")).toBe("extra");
    expect(classifyDigitError("1234", "1934")).toBe("substitution");
  });
});

describe("typing-test", () => {
  it("calcula WPM neto con la convención de 5 caracteres", () => {
    const events: AttemptEvent[] = [];
    // 50 teclas correctas espaciadas 100ms en 60s → 50/5 = 10 WPM
    for (let i = 0; i < 50; i++) {
      events.push({ seq: i, tMs: i * 100, type: "keystroke", payload: { correct: true } });
    }
    const config = { durationSec: 60, textBand: "mid" as const, textIndex: 0 };
    const m = typingTest.computeMetrics(events, config);
    expect(m.netWpm).toBe(10);
    expect(m.accuracy).toBe(1);
    expect(m.avgInterKeyMs).toBe(100);
  });
});
