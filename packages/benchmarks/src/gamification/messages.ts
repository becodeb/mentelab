import { hashString, seededRandom } from "../utils/stats";

/**
 * Catálogo curado de frases positivas (doc 05 §5): el cierre de una partida
 * SIEMPRE destaca algo real y positivo. Nunca "perdiste".
 */
const MESSAGES = {
  record: [
    "¡NUEVO RÉCORD PERSONAL! Sos imparable 🚀",
    "¡Rompiste tu propia marca! Nadie te gana a vos mismo 🌟",
    "¡Récord! Tu entrenamiento está dando frutos 🏆",
  ],
  improved: [
    "¡Mejor que tu promedio! Vas para arriba 📈",
    "Hoy jugaste mejor que de costumbre. ¡Se nota la práctica! 💪",
    "¡Superaste tu promedio! Un pasito más cada día 👣",
  ],
  nearRecord: [
    "¡Casi récord! Estás a un pelito de tu mejor marca 🔥",
    "Muy cerca de tu récord… la próxima cae 😎",
  ],
  normal: [
    "¡Partida completada! Cada intento te hace más fuerte 💡",
    "¡Bien ahí! La constancia es tu superpoder 🔁",
    "Entrenaste tu cerebro un poquito más. ¡Suma! ➕",
    "¡Buen trabajo! Lo importante es seguir jugando 🎮",
  ],
  comeback: [
    "¡Qué bueno verte de nuevo! Tu cerebro te extrañaba 🤗",
    "¡Volviste! Hoy arranca una nueva racha 🔥",
  ],
} as const;

export type EncouragementSituation = keyof typeof MESSAGES;

/** Elige una frase estable por intento (misma respuesta si se reintenta el POST). */
export function encouragementFor(situation: EncouragementSituation, seedKey: string): string {
  const pool: readonly string[] = MESSAGES[situation];
  const rand = seededRandom(hashString(seedKey));
  return pool[Math.floor(rand() * pool.length)] ?? pool[0]!;
}

export function pickSituation(ctx: {
  isPersonalRecord: boolean;
  beatOwnAvg30d: boolean;
  nearRecord: boolean;
  daysSinceLastPlayed: number | null;
}): EncouragementSituation {
  if (ctx.isPersonalRecord) return "record";
  if (ctx.daysSinceLastPlayed !== null && ctx.daysSinceLastPlayed >= 14) return "comeback";
  if (ctx.beatOwnAvg30d) return "improved";
  if (ctx.nearRecord) return "nearRecord";
  return "normal";
}
