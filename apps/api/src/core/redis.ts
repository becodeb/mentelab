import { Redis } from "ioredis";
import { env } from "../env";
import { logger } from "./logger";

/**
 * Redis es SIEMPRE derivado y opcional (doc 03 §4): si no está disponible,
 * leaderboards y caché degradan a SQL sin romper nada.
 */
let client: Redis | null = null;
let available = false;

if (env.REDIS_URL) {
  client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 2000, 30_000),
  });
  client.on("ready", () => {
    available = true;
    logger.info("Redis conectado");
  });
  client.on("error", () => {
    if (available) logger.warn("Redis no disponible: degradando a SQL");
    available = false;
  });
}

export function redis(): Redis | null {
  return available && client ? client : null;
}

/** Caché JSON con TTL; no-op silencioso sin Redis. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = redis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* caché best-effort */
  }
}
