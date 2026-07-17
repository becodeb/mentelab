import type { NextFunction, Request, Response } from "express";
import { redis } from "./redis";
import { tooMany } from "./errors";

/** Rate limit por clave: Redis si está, si no memoria local (suficiente 1 nodo). */
const memory = new Map<string, { count: number; resetAt: number }>();

async function hit(key: string, windowSec: number, max: number): Promise<boolean> {
  const r = redis();
  if (r) {
    try {
      const n = await r.incr(`rl:${key}`);
      if (n === 1) await r.expire(`rl:${key}`, windowSec);
      return n <= max;
    } catch {
      /* cae a memoria */
    }
  }
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  cur.count++;
  return cur.count <= max;
}

export function rateLimit(opts: { windowSec: number; max: number; keyFn?: (req: Request) => string }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const base = opts.keyFn ? opts.keyFn(req) : (req.ip ?? "unknown");
    const ok = await hit(`${req.path}:${base}`, opts.windowSec, opts.max);
    if (!ok) return next(tooMany());
    next();
  };
}
