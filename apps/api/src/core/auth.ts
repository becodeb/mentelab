import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { PrincipalSchema, type Principal, type StaffRole } from "@mentelab/shared";
import { env, isProd } from "../env";
import { forbidden, unauthorized } from "./errors";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const COOKIE = "ml_session";

/** Sesiones: alumnos/invitados 12 h (la jornada escolar); staff 8 h. */
function ttlFor(principal: Principal): string {
  return principal.kind === "staff" ? "8h" : "12h";
}

export async function issueSession(res: Response, principal: Principal): Promise<void> {
  const token = await new SignJWT({ p: principal })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttlFor(principal))
    .sign(SECRET);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 12 * 3600 * 1000,
    path: "/",
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE, { path: "/" });
}

async function principalFromRequest(req: Request): Promise<Principal | null> {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return PrincipalSchema.parse(payload["p"]);
  } catch {
    return null;
  }
}

/** Contexto de request: el institutionId viene SIEMPRE del JWT, jamás del body. */
export interface RequestContext {
  principal: Principal;
}

/** Request con contexto autenticado (evitamos module augmentation con Bundler). */
export type AuthedRequest = Request & { ctx?: RequestContext };

export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const principal = await principalFromRequest(req);
    if (!principal) return next(unauthorized());
    (req as AuthedRequest).ctx = { principal };
    next();
  };
}

/** Solo jugadores (alumnos o invitados). */
export function requirePlayer() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const principal = await principalFromRequest(req);
    if (!principal || principal.kind === "staff") return next(unauthorized());
    (req as AuthedRequest).ctx = { principal };
    next();
  };
}

const ROLE_RANK: Record<StaffRole, number> = {
  TEACHER: 1,
  INSTITUTION_ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function requireStaff(minRole: StaffRole = "TEACHER") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const principal = await principalFromRequest(req);
    if (!principal) return next(unauthorized());
    if (principal.kind !== "staff") return next(forbidden());
    if (ROLE_RANK[principal.role] < ROLE_RANK[minRole]) return next(forbidden());
    (req as AuthedRequest).ctx = { principal };
    next();
  };
}

export function ctxOf(req: Request): RequestContext {
  const ctx = (req as AuthedRequest).ctx;
  if (!ctx) throw unauthorized();
  return ctx;
}

/** Principal staff con su institución (SUPER_ADMIN puede operar cross-tenant). */
export function staffOf(req: Request): Extract<Principal, { kind: "staff" }> {
  const { principal } = ctxOf(req);
  if (principal.kind !== "staff") throw forbidden();
  return principal;
}

export function playerOf(req: Request): Extract<Principal, { kind: "student" | "guest" }> {
  const { principal } = ctxOf(req);
  if (principal.kind === "staff") throw forbidden();
  return principal;
}
