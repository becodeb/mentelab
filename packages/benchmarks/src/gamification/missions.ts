import { hashString, seededRandom } from "../utils/stats";
import { BENCHMARK_SLUGS, getBenchmark } from "../registry";

export type MissionKind =
  | "play_n" // jugá N partidas (cualquier juego)
  | "distinct_benchmarks" // jugá N juegos distintos
  | "play_benchmark" // jugá N partidas de X
  | "beat_avg" // superá tu promedio en una partida
  | "complete_clean"; // completá una partida sin perder el foco

export interface MissionDef {
  code: string;
  kind: MissionKind;
  title: string;
  emoji: string;
  target: number;
  xpReward: number;
  benchmarkSlug?: string;
}

/**
 * Genera las 3 misiones diarias de un jugador, determinísticas por
 * (playerId, fecha): 1 de volumen + 1 de variedad + 1 personal/alcanzable.
 */
export function dailyMissionsFor(playerId: string, dateIso: string): MissionDef[] {
  const rand = seededRandom(hashString(`${playerId}:${dateIso}`));

  // 1) Volumen: 2 a 4 partidas.
  const n = 2 + Math.floor(rand() * 3);
  const volume: MissionDef = {
    code: `play-${n}`,
    kind: "play_n",
    title: `Jugá ${n} partidas`,
    emoji: "🎮",
    target: n,
    xpReward: 20,
  };

  // 2) Variedad: 2 juegos distintos, o un benchmark puntual.
  const varietyRoll = rand();
  let variety: MissionDef;
  if (varietyRoll < 0.5) {
    variety = {
      code: "distinct-2",
      kind: "distinct_benchmarks",
      title: "Jugá 2 juegos distintos",
      emoji: "🧭",
      target: 2,
      xpReward: 20,
    };
  } else {
    const slug = BENCHMARK_SLUGS[Math.floor(rand() * BENCHMARK_SLUGS.length)]!;
    const def = getBenchmark(slug);
    variety = {
      code: `play-benchmark-${slug}`,
      kind: "play_benchmark",
      title: `Jugá una de ${def.name}`,
      emoji: def.icon,
      target: 1,
      xpReward: 20,
      benchmarkSlug: slug,
    };
  }

  // 3) Personal: siempre alcanzable (superar el propio promedio o jugar limpio).
  const personal: MissionDef =
    rand() < 0.6
      ? {
          code: "beat-avg",
          kind: "beat_avg",
          title: "Superá tu propio promedio en una partida",
          emoji: "📈",
          target: 1,
          xpReward: 30,
        }
      : {
          code: "clean-run",
          kind: "complete_clean",
          title: "Completá una partida sin distraerte",
          emoji: "🧘",
          target: 1,
          xpReward: 25,
        };

  return [volume, variety, personal];
}

/** Cuánto avanza cada misión con un intento completado. */
export function missionProgressForAttempt(
  mission: MissionDef,
  attempt: {
    benchmarkSlug: string;
    beatOwnAvg: boolean;
    focusLostCount: number;
    distinctBenchmarksToday: number;
  },
): number {
  switch (mission.kind) {
    case "play_n":
      return 1;
    case "distinct_benchmarks":
      // progreso = cantidad de juegos distintos hoy (se setea, no se suma)
      return attempt.distinctBenchmarksToday;
    case "play_benchmark":
      return attempt.benchmarkSlug === mission.benchmarkSlug ? 1 : 0;
    case "beat_avg":
      return attempt.beatOwnAvg ? 1 : 0;
    case "complete_clean":
      return attempt.focusLostCount === 0 ? 1 : 0;
  }
}

/** Las misiones de variedad se SETEAN al progreso actual; el resto se suma. */
export function missionProgressMode(kind: MissionKind): "add" | "set" {
  return kind === "distinct_benchmarks" ? "set" : "add";
}
