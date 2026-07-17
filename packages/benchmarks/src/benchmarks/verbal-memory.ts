import { z } from "zod";
import type { AttemptEvent } from "@mentelab/shared";
import type { BenchmarkDefinition } from "../types";
import { eventsOfType } from "../types";
import { mean, linRegSlope } from "../utils/stats";

/** Pool de palabras en español, frecuentes y apropiadas para edad escolar. */
export const WORD_POOL: string[] = [
  "casa", "perro", "gato", "sol", "luna", "árbol", "flor", "agua", "fuego", "tierra",
  "cielo", "mar", "río", "montaña", "bosque", "piedra", "arena", "nube", "lluvia", "viento",
  "libro", "lápiz", "mesa", "silla", "puerta", "ventana", "techo", "pared", "piso", "cama",
  "pan", "leche", "queso", "manzana", "banana", "naranja", "uva", "pera", "sandía", "melón",
  "auto", "tren", "avión", "barco", "bici", "camión", "cohete", "globo", "pelota", "juego",
  "amigo", "familia", "escuela", "maestra", "recreo", "plaza", "parque", "calle", "ciudad", "pueblo",
  "mano", "pie", "cabeza", "ojo", "boca", "nariz", "oreja", "pelo", "diente", "corazón",
  "rojo", "azul", "verde", "amarillo", "negro", "blanco", "rosa", "violeta", "naranja", "gris",
  "león", "tigre", "oso", "lobo", "zorro", "conejo", "tortuga", "pájaro", "pez", "caballo",
  "vaca", "oveja", "cerdo", "gallina", "pato", "rana", "abeja", "hormiga", "araña", "mariposa",
  "verano", "invierno", "otoño", "primavera", "mañana", "tarde", "noche", "día", "semana", "año",
  "música", "canción", "baile", "fiesta", "regalo", "torta", "helado", "dulce", "chocolate", "caramelo",
  "zapato", "media", "campera", "gorro", "guante", "bufanda", "remera", "pantalón", "vestido", "botón",
  "estrella", "planeta", "espacio", "robot", "dragón", "castillo", "tesoro", "pirata", "mago", "héroe",
  "número", "letra", "palabra", "cuento", "dibujo", "pintura", "papel", "tijera", "goma", "regla",
  "fútbol", "carrera", "salto", "nadar", "correr", "caminar", "jugar", "cantar", "leer", "escribir",
];

const ConfigSchema = z.object({
  lives: z.number().int().min(1).max(5),
  /** Probabilidad de mostrar una palabra ya vista (0-1). */
  seenProbability: z.number().min(0.2).max(0.7),
});
export type VerbalMemoryConfig = z.infer<typeof ConfigSchema>;

const MetricsSchema = z.object({
  wordsCorrect: z.number().int(),
  wordsShown: z.number().int(),
  /** Dijo "la vi" pero era nueva (falso reconocimiento). */
  falseSeen: z.number().int(),
  /** Dijo "nueva" pero ya la había visto (olvido). */
  falseNew: z.number().int(),
  avgLatencyMs: z.number(),
  /** Pendiente de latencia: positiva = se fue cansando (curva de fatiga). */
  fatigueTrend: z.number(),
});
export type VerbalMemoryMetrics = z.infer<typeof MetricsSchema>;

export const verbalMemory: BenchmarkDefinition<VerbalMemoryConfig, VerbalMemoryMetrics> = {
  slug: "verbal-memory",
  name: "Memoria de Palabras",
  shortDescription: "¿Esta palabra ya apareció o es nueva?",
  instructions: [
    "Van a aparecer palabras, de a una.",
    "Si la palabra YA apareció antes, tocá «LA VI».",
    "Si es la primera vez que aparece, tocá «NUEVA».",
    "Tenés 3 vidas. ¡Cuántas más aciertes, mejor!",
  ],
  icon: "📖",
  category: "MEMORY",
  minAge: 7,
  unit: "palabras",

  configSchema: ConfigSchema,
  metricsSchema: MetricsSchema,
  eventTypes: ["word_shown", "word_answer", "life_lost"] as const,

  defaultConfigFor() {
    return { lives: 3, seenProbability: 0.4 };
  },
  adaptConfig(config) {
    return config;
  },

  computeMetrics(events: AttemptEvent[]) {
    const answers = eventsOfType(events, "word_answer");
    const correct = answers.filter((p) => p["correct"] === true).length;
    const falseSeen = answers.filter(
      (p) => p["correct"] === false && p["action"] === "seen",
    ).length;
    const falseNew = answers.filter((p) => p["correct"] === false && p["action"] === "new").length;
    const latencies = answers
      .map((p) => Number(p["latencyMs"]))
      .filter((v) => Number.isFinite(v) && v > 0);
    return {
      wordsCorrect: correct,
      wordsShown: eventsOfType(events, "word_shown").length,
      falseSeen,
      falseNew,
      avgLatencyMs: Math.round(mean(latencies)),
      fatigueTrend: Math.round(linRegSlope(latencies.map((y, x) => ({ x, y }))) * 100) / 100,
    };
  },
  score(m) {
    return m.wordsCorrect;
  },
  scoreDirection: "higher_better",
  ageReference: [
    { age: 6, p50: 15, sigma: 8 },
    { age: 8, p50: 20, sigma: 10 },
    { age: 10, p50: 25, sigma: 11 },
    { age: 12, p50: 30, sigma: 12 },
    { age: 14, p50: 35, sigma: 13 },
    { age: 16, p50: 40, sigma: 14 },
    { age: 18, p50: 42, sigma: 14 },
  ],
  summarize(m) {
    return {
      levelReached: null,
      errorCount: m.falseSeen + m.falseNew,
      successCount: m.wordsCorrect,
    };
  },
  contributions: { working_memory: 0.2 },
  masteryLevels: { bronze: 25, silver: 40, gold: 60 },
};
