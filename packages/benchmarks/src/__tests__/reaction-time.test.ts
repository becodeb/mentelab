import { describe, expect, it } from "vitest";
import type { AttemptEvent } from "@mentelab/shared";
import { reactionTime } from "../benchmarks/reaction-time";
import { normalizeScore } from "../normalize";

function ev(seq: number, type: string, payload?: Record<string, unknown>): AttemptEvent {
  return { seq, tMs: seq * 1000, type, payload };
}

describe("reaction-time", () => {
  it("computa métricas desde eventos crudos", () => {
    const events: AttemptEvent[] = [
      ev(0, "game_start"),
      ev(1, "stimulus_shown", { round: 1 }),
      ev(2, "round_click", { round: 1, reactionMs: 320 }),
      ev(3, "stimulus_shown", { round: 2 }),
      ev(4, "round_click", { round: 2, reactionMs: 280 }),
      ev(5, "false_start", { round: 3 }),
      ev(6, "stimulus_shown", { round: 3 }),
      ev(7, "round_click", { round: 3, reactionMs: 300 }),
      // anticipación: <120ms no cuenta como válida
      ev(8, "stimulus_shown", { round: 4 }),
      ev(9, "round_click", { round: 4, reactionMs: 80 }),
      ev(10, "game_end"),
    ];
    const config = reactionTime.defaultConfigFor(10);
    const m = reactionTime.computeMetrics(events, config);
    expect(m.medianMs).toBe(300);
    expect(m.bestMs).toBe(280);
    expect(m.worstMs).toBe(320);
    expect(m.falseStarts).toBe(1);
    expect(m.anticipations).toBe(1);
    expect(reactionTime.score(m)).toBe(300);
    const s = reactionTime.summarize(m);
    expect(s.errorCount).toBe(2);
    expect(s.successCount).toBe(3);
  });

  it("normaliza por edad: mismo score vale más a los 6 que a los 16", () => {
    const at6 = normalizeScore(400, 6, reactionTime.ageReference, "lower_better");
    const at16 = normalizeScore(400, 16, reactionTime.ageReference, "lower_better");
    expect(at6).toBeGreaterThan(at16);
    // La mediana esperada para la edad da ~50.
    expect(normalizeScore(400, 10, reactionTime.ageReference, "lower_better")).toBeCloseTo(50, 0);
  });

  it("menos rondas para los más chicos", () => {
    expect(reactionTime.defaultConfigFor(6).rounds).toBeLessThan(
      reactionTime.defaultConfigFor(12).rounds,
    );
  });
});
