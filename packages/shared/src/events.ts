import { z } from "zod";

/**
 * Evento crudo de un intento. `tMs` es el tiempo relativo al inicio del juego
 * medido con performance.now() (alta resolución, monotónico).
 * Los `type` comunes los emite el GameShell; cada benchmark agrega los suyos
 * y los valida con su propio eventSchema.
 */
export const AttemptEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  tMs: z.number().nonnegative(),
  type: z.string().min(1).max(64),
  payload: z.record(z.unknown()).optional(),
});
export type AttemptEvent = z.infer<typeof AttemptEventSchema>;

/** Eventos comunes emitidos por el GameShell para todos los benchmarks. */
export const COMMON_EVENT_TYPES = [
  "game_start",
  "game_end",
  "focus_lost",
  "focus_gained",
  "paused",
  "resumed",
  "tutorial_shown",
  "countdown_start",
  "abandoned",
] as const;

/** Información del dispositivo capturada al enviar un intento. */
export const DeviceInfoSchema = z.object({
  browser: z.string().max(200).optional(),
  os: z.string().max(100).optional(),
  deviceType: z.enum(["mobile", "tablet", "desktop", "unknown"]).default("unknown"),
  screenW: z.number().int().positive().optional(),
  screenH: z.number().int().positive().optional(),
  dpr: z.number().positive().optional(),
  inputType: z.enum(["touch", "mouse", "keyboard", "mixed", "unknown"]).default("unknown"),
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
