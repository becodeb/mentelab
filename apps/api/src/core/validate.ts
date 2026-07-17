import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validación Zod en el borde: NADA llega a un servicio sin tipar.
 * El resultado parseado reemplaza al original (con defaults y coerciones).
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    (req as Request & { validatedQuery: T }).validatedQuery = parsed.data;
    next();
  };
}

export function getQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}
