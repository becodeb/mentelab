import { describe, expect, it } from "vitest";
import { computeAttemptXp, levelFromTotalXp, xpForLevelUp } from "../gamification/xp";
import { evaluateBadges, type BadgeContext } from "../gamification/badges";
import { dailyMissionsFor, missionProgressForAttempt } from "../gamification/missions";
import { encouragementFor, pickSituation } from "../gamification/messages";

const baseCtx: BadgeContext = {
  benchmarkSlug: "reaction-time",
  score: 500,
  isPersonalRecord: false,
  totalAttempts: 1,
  currentStreak: 1,
  distinctBenchmarksPlayed: 1,
  attemptsToday: 1,
  totalPlayMs: 60_000,
  recordsLast7d: 0,
  daysSinceLastPlayed: null,
  improvement30dPct: null,
};

describe("xp", () => {
  it("curva de niveles", () => {
    expect(xpForLevelUp(1)).toBe(100);
    expect(xpForLevelUp(2)).toBe(140);
    expect(levelFromTotalXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
    expect(levelFromTotalXp(100).level).toBe(2);
    expect(levelFromTotalXp(239)).toEqual({ level: 2, xpIntoLevel: 139, xpForNextLevel: 140 });
    expect(levelFromTotalXp(240).level).toBe(3);
  });

  it("anti-farming: rendimiento decreciente por benchmark/día", () => {
    const base = (n: number) =>
      computeAttemptXp({
        isFirstOfDay: false,
        isDifferentFromPrevious: false,
        beatOwnAvg30d: false,
        isPersonalRecord: false,
        attemptsOfBenchmarkToday: n,
        streakReachedToday: null,
      }).find((g) => g.reason === "attempt")!.amount;
    expect(base(1)).toBe(10);
    expect(base(6)).toBe(5);
    expect(base(11)).toBe(1);
  });

  it("récord y racha suman bonus", () => {
    const grants = computeAttemptXp({
      isFirstOfDay: true,
      isDifferentFromPrevious: true,
      beatOwnAvg30d: true,
      isPersonalRecord: true,
      attemptsOfBenchmarkToday: 1,
      streakReachedToday: 7,
    });
    const total = grants.reduce((a, g) => a + g.amount, 0);
    expect(total).toBe(10 + 10 + 5 + 10 + 25 + 30);
  });
});

describe("badges", () => {
  it("no re-otorga insignias ya ganadas", () => {
    const ctx = { ...baseCtx, currentStreak: 3 };
    expect(evaluateBadges(ctx, new Set()).map((b) => b.code)).toContain("streak-3");
    expect(evaluateBadges(ctx, new Set(["streak-3"])).map((b) => b.code)).not.toContain(
      "streak-3",
    );
  });

  it("maestría respeta la dirección del score", () => {
    // reaction-time es lower_better: 280ms = oro
    const gold = evaluateBadges({ ...baseCtx, score: 280 }, new Set());
    expect(gold.map((b) => b.code)).toContain("mastery-reaction-time-gold");
    // 500ms no gana nada de maestría
    const none = evaluateBadges({ ...baseCtx, score: 500 }, new Set());
    expect(none.filter((b) => b.family === "mastery")).toHaveLength(0);
  });

  it("comeback premia volver tras 14+ días", () => {
    const back = evaluateBadges({ ...baseCtx, daysSinceLastPlayed: 20 }, new Set());
    expect(back.map((b) => b.code)).toContain("comeback");
  });
});

describe("missions", () => {
  it("son determinísticas por jugador y fecha", () => {
    const a = dailyMissionsFor("player-1", "2026-07-16");
    const b = dailyMissionsFor("player-1", "2026-07-16");
    const c = dailyMissionsFor("player-2", "2026-07-16");
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    // Otro jugador puede tener otras misiones (no siempre, pero el set es válido)
    expect(c).toHaveLength(3);
  });

  it("el progreso responde al intento", () => {
    const [volume] = dailyMissionsFor("p", "2026-07-16");
    expect(
      missionProgressForAttempt(volume!, {
        benchmarkSlug: "aim-trainer",
        beatOwnAvg: false,
        focusLostCount: 0,
        distinctBenchmarksToday: 1,
      }),
    ).toBe(1);
  });
});

describe("messages", () => {
  it("prioriza récord sobre todo lo demás", () => {
    expect(
      pickSituation({
        isPersonalRecord: true,
        beatOwnAvg30d: true,
        nearRecord: true,
        daysSinceLastPlayed: 30,
      }),
    ).toBe("record");
  });

  it("frase estable por seed (idempotencia del complete)", () => {
    expect(encouragementFor("record", "attempt-123")).toBe(
      encouragementFor("record", "attempt-123"),
    );
  });
});
