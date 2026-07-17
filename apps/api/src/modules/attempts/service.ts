import { prisma } from "@mentelab/db";
import { getBenchmark, normalizeScore } from "@mentelab/benchmarks";
import { COMMON_EVENT_TYPES, type AttemptEvent } from "@mentelab/shared";

/** Contexto del jugador congelado en el intento (doc 03 §2). */
export interface PlayerGameContext {
  scope: "INSTITUTIONAL" | "GLOBAL";
  institutionId: string | null;
  classroomId: string | null;
  gradeLevel: number | null;
  playerAge: number | null;
}

export async function resolvePlayerContext(playerId: string): Promise<PlayerGameContext> {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
    include: {
      studentProfile: { include: { classroom: { include: { grade: true } } } },
    },
  });
  const nowYear = new Date().getFullYear();
  if (player.type === "STUDENT" && player.studentProfile) {
    const sp = player.studentProfile;
    const age = player.birthYear ? nowYear - player.birthYear : sp.classroom.grade.typicalAge;
    return {
      scope: "INSTITUTIONAL",
      institutionId: sp.institutionId,
      classroomId: sp.classroomId,
      gradeLevel: sp.classroom.grade.level,
      playerAge: age,
    };
  }
  return {
    scope: "GLOBAL",
    institutionId: null,
    classroomId: null,
    gradeLevel: null,
    playerAge: player.birthYear ? nowYear - player.birthYear : null,
  };
}

/** Config de dificultad: base por edad + adaptación por historial. */
export async function buildConfig(playerId: string, benchmarkSlug: string, age: number | null) {
  const def = getBenchmark(benchmarkSlug);
  const stats = await prisma.playerBenchmarkStats.findUnique({
    where: { playerId_benchmarkSlug: { playerId, benchmarkSlug } },
  });
  const base = def.defaultConfigFor(age);
  return def.adaptConfig(base, {
    bestScore: stats?.bestScore ?? null,
    avg30d: stats?.avg30d ?? null,
    totalAttempts: stats?.totalAttempts ?? 0,
  });
}

const COMMON = new Set<string>(COMMON_EVENT_TYPES);

/** Filtra eventos a los tipos conocidos (comunes + propios del benchmark). */
export function sanitizeEvents(benchmarkSlug: string, events: AttemptEvent[]): AttemptEvent[] {
  const def = getBenchmark(benchmarkSlug);
  const allowed = new Set([...COMMON, ...def.eventTypes]);
  return events
    .filter((e) => allowed.has(e.type))
    .sort((a, b) => a.seq - b.seq)
    .map((e, i) => ({ ...e, seq: i })); // re-secuencia densa
}

/**
 * Heurísticas de calidad del dato (doc 07 §5): detecta intentos imposibles
 * o robóticos. Se guardan igual (status INVALID) pero no rankean.
 */
export function validateAttemptQuality(
  benchmarkSlug: string,
  events: AttemptEvent[],
  metrics: unknown,
): string | null {
  const gameEvents = events.filter((e) => !COMMON.has(e.type));
  if (gameEvents.length === 0) return "no_events";

  if (benchmarkSlug === "reaction-time") {
    const m = metrics as { medianMs: number; stdDevMs: number; roundTimesMs: number[] };
    const validRounds = m.roundTimesMs.filter((t) => t >= 120);
    if (validRounds.length >= 3 && m.medianMs > 0 && m.medianMs < 90) return "impossible_speed";
    if (validRounds.length >= 5 && m.stdDevMs === 0) return "robotic_regularity";
  }
  if (benchmarkSlug === "typing-test") {
    const m = metrics as { netWpm: number; avgInterKeyMs: number; keystrokes: number };
    if (m.netWpm > 200) return "impossible_speed";
    if (m.keystrokes >= 50 && m.avgInterKeyMs > 0 && m.avgInterKeyMs < 25) return "robotic_regularity";
  }
  return null;
}

/** Recomputo oficial server-side (nunca se confía en el cliente). */
export function recomputeMetrics(benchmarkSlug: string, events: AttemptEvent[], config: unknown) {
  const def = getBenchmark(benchmarkSlug);
  const parsedConfig = def.configSchema.parse(config);
  const metrics = def.computeMetrics(events, parsedConfig);
  def.metricsSchema.parse(metrics); // garantía de forma
  const score = def.score(metrics);
  const summary = def.summarize(metrics);
  return { def, metrics, score, summary };
}

export function normalizedScoreFor(benchmarkSlug: string, score: number, age: number | null) {
  const def = getBenchmark(benchmarkSlug);
  return normalizeScore(score, age, def.ageReference, def.scoreDirection);
}
