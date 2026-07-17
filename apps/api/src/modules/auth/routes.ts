import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@mentelab/db";
import {
  GuestInitSchema,
  StaffLoginSchema,
  StudentLoginSchema,
  type ClassLookupResponse,
  type Principal,
} from "@mentelab/shared";
import { asyncHandler, badRequest, notFound, unauthorized } from "../../core/errors";
import { validateBody } from "../../core/validate";
import { clearSession, ctxOf, issueSession, requireAuth } from "../../core/auth";
import { rateLimit } from "../../core/rateLimit";

export const authRouter: ReturnType<typeof Router> = Router();

/**
 * Resuelve un código de clase → grilla de alumnos del curso.
 * Público (es el primer paso del login) pero rate-limited.
 */
authRouter.get(
  "/class/:classCode",
  rateLimit({ windowSec: 60, max: 30 }),
  asyncHandler(async (req, res) => {
    const classCode = String(req.params["classCode"]).toUpperCase().trim();
    const classroom = await prisma.classroom.findUnique({
      where: { classCode },
      include: {
        institution: { select: { name: true } },
        grade: { select: { name: true } },
        students: {
          where: { player: { active: true } },
          include: { player: { select: { id: true, displayName: true, avatarId: true } } },
          orderBy: { firstName: "asc" },
        },
      },
    });
    if (!classroom || !classroom.active) throw notFound("Ese código de clase no existe");
    const response: ClassLookupResponse = {
      classroomId: classroom.id,
      classCode: classroom.classCode,
      label: `${classroom.grade.name} ${classroom.division}`,
      institutionName: classroom.institution.name,
      students: classroom.students.map((s) => ({
        playerId: s.player.id,
        displayName: s.player.displayName,
        avatarId: s.player.avatarId,
        secretType: s.secretType,
      })),
    };
    res.json(response);
  }),
);

/** Provider student-secret: PIN4 o secuencia de imágenes. */
authRouter.post(
  "/student/login",
  rateLimit({ windowSec: 60, max: 5, keyFn: (req) => String((req.body as { playerId?: string })?.playerId ?? req.ip) }),
  validateBody(StudentLoginSchema),
  asyncHandler(async (req, res) => {
    const { playerId, secret } = req.body;
    const profile = await prisma.studentProfile.findUnique({
      where: { playerId },
      include: { player: true },
    });
    if (!profile || !profile.player.active) throw unauthorized("Alumno no encontrado");
    const ok = await bcrypt.compare(secret, profile.secretHash);
    if (!ok) throw unauthorized("Esa no es tu clave. ¡Probá de nuevo o pedile ayuda a tu seño!");
    const principal: Principal = {
      kind: "student",
      playerId,
      institutionId: profile.institutionId,
      classroomId: profile.classroomId,
      displayName: profile.player.displayName,
    };
    await issueSession(res, principal);
    res.json({ principal });
  }),
);

/** Provider staff-password. */
authRouter.post(
  "/staff/login",
  rateLimit({ windowSec: 60, max: 10 }),
  validateBody(StaffLoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const staff = await prisma.staffUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!staff || !staff.active) throw unauthorized("Credenciales inválidas");
    const ok = await bcrypt.compare(password, staff.passwordHash);
    if (!ok) throw unauthorized("Credenciales inválidas");
    const principal: Principal = {
      kind: "staff",
      staffId: staff.id,
      role: staff.role,
      institutionId: staff.institutionId,
      name: staff.name,
    };
    await issueSession(res, principal);
    res.json({ principal });
  }),
);

/**
 * Provider guest-device: crea (o recupera) el jugador invitado del dispositivo.
 * Sin challenge: es anónimo por diseño (doc 07 §1).
 */
authRouter.post(
  "/guest/init",
  rateLimit({ windowSec: 3600, max: 20 }),
  validateBody(GuestInitSchema),
  asyncHandler(async (req, res) => {
    const { deviceUuid, alias } = req.body;
    let guest = await prisma.guestProfile.findUnique({
      where: { deviceUuid },
      include: { player: true },
    });
    if (guest?.migratedToId) throw badRequest("Este perfil ya fue migrado a una cuenta de alumno");
    if (!guest) {
      const player = await prisma.player.create({
        data: {
          type: "GUEST",
          displayName: alias ?? "Invitado",
          avatarId: "octopus",
          guestProfile: { create: { deviceUuid, alias: alias ?? null } },
          progress: { create: {} },
        },
        include: { guestProfile: true },
      });
      guest = { ...player.guestProfile!, player };
    } else if (alias && alias !== guest.alias) {
      // Alias opt-in para ranking global (con lista básica de bloqueo).
      await prisma.guestProfile.update({ where: { deviceUuid }, data: { alias } });
      await prisma.player.update({ where: { id: guest.playerId }, data: { displayName: alias } });
      guest.player.displayName = alias;
    }
    const principal: Principal = {
      kind: "guest",
      playerId: guest.playerId,
      displayName: guest.player.displayName,
    };
    await issueSession(res, principal);
    res.json({ principal });
  }),
);

/**
 * Migración invitado → alumno (doc 03 §5): re-asigna los intentos del guest al
 * alumno logueado PERO conservando scope GLOBAL (jamás entran a rankings
 * institucionales). Requiere sesión de alumno + deviceUuid del guest.
 */
authRouter.post(
  "/guest/migrate",
  requireAuth(),
  validateBody(GuestInitSchema.pick({ deviceUuid: true })),
  asyncHandler(async (req, res) => {
    const { principal } = ctxOf(req);
    if (principal.kind !== "student") throw badRequest("Solo un alumno puede migrar historial");
    const guest = await prisma.guestProfile.findUnique({ where: { deviceUuid: req.body.deviceUuid } });
    if (!guest || guest.migratedToId) throw notFound("No hay historial de invitado para migrar");

    const student = await prisma.studentProfile.findUnique({
      where: { playerId: principal.playerId },
      include: { institution: true },
    });
    const settings = (student?.institution.settings ?? {}) as { guestMigrationAllowed?: boolean };
    if (settings.guestMigrationAllowed === false)
      throw badRequest("Tu institución no permite migrar historial externo");

    const moved = await prisma.$transaction(async (tx) => {
      const result = await tx.attempt.updateMany({
        where: { playerId: guest.playerId },
        // scope se mantiene GLOBAL a propósito: jugado fuera de condiciones de aula.
        data: { playerId: principal.playerId },
      });
      await tx.guestProfile.update({
        where: { deviceUuid: req.body.deviceUuid },
        data: { migratedToId: principal.playerId },
      });
      await tx.player.update({ where: { id: guest.playerId }, data: { active: false } });
      return result.count;
    });
    res.json({ migratedAttempts: moved });
  }),
);

authRouter.get(
  "/me",
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({ principal: ctxOf(req).principal });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});
