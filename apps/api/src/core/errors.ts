import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

/** Error de aplicación con código estable para el cliente. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (msg = "No encontrado") => new AppError(404, "not_found", msg);
export const forbidden = (msg = "No autorizado para esta acción") =>
  new AppError(403, "forbidden", msg);
export const unauthorized = (msg = "Necesitás iniciar sesión") =>
  new AppError(401, "unauthorized", msg);
export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, "bad_request", msg, details);
export const conflict = (msg: string) => new AppError(409, "conflict", msg);
export const tooMany = (msg = "Demasiados intentos, esperá un momento") =>
  new AppError(429, "rate_limited", msg);

/** Envuelve handlers async para que los throw lleguen al errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "validation_error", message: "Datos inválidos", details: err.flatten() },
    });
    return;
  }
  logger.error({ err, path: req.path }, "error no manejado");
  res.status(500).json({ error: { code: "internal", message: "Error interno" } });
}
