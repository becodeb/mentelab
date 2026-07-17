import { Router } from "express";
import { z } from "zod";
import { prisma } from "@mentelab/db";
import {
  CreateStudentSchema,
  ImportStudentsSchema,
  MoveStudentSchema,
  UpdateStudentSchema,
  type StudentCredential,
  type StudentRow,
} from "@mentelab/shared";
import { asyncHandler, badRequest, forbidden, notFound } from "../../core/errors";
import { validateBody } from "../../core/validate";
import { requireStaff, staffOf } from "../../core/auth";
import {
  assertClassroomAccess,
  displayNameOf,
  generateSecret,
  hashSecret,
  pickAvatar,
} from "./service";

export const rosterRouter: ReturnType<typeof Router> = Router();

/** Cursos visibles para el staff logueado (docente: asignados; admin: todos). */
rosterRouter.get(
  "/classrooms",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const where =
      staff.role === "TEACHER"
        ? { teachers: { some: { staffUserId: staff.staffId } }, active: true }
        : { institutionId: staff.institutionId ?? undefined, active: true };
    const classrooms = await prisma.classroom.findMany({
      where,
      include: {
        grade: true,
        schoolYear: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ grade: { level: "asc" } }, { division: "asc" }],
    });
    res.json({
      classrooms: classrooms.map((c) => ({
        id: c.id,
        label: `${c.grade.name} ${c.division}`,
        gradeId: c.gradeId,
        gradeLevel: c.grade.level,
        typicalAge: c.grade.typicalAge,
        schoolYear: c.schoolYear.name,
        classCode: c.classCode,
        studentCount: c._count.students,
      })),
    });
  }),
);

/** Alumnos de un curso con stats resumidas (tabla del panel docente). */
rosterRouter.get(
  "/classrooms/:id/students",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const classroomId = String(req.params["id"]);
    await assertClassroomAccess(staff, classroomId);
    const benchmark = req.query["benchmark"] ? String(req.query["benchmark"]) : null;

    const students = await prisma.studentProfile.findMany({
      where: { classroomId },
      include: {
        player: { include: { progress: true, stats: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const rows: StudentRow[] = students.map((s) => {
      const stats = benchmark
        ? s.player.stats.filter((st) => st.benchmarkSlug === benchmark)
        : s.player.stats;
      const totalAttempts = stats.reduce((a, st) => a + st.totalAttempts, 0);
      const one = benchmark ? stats[0] : null;
      const improvements = stats
        .map((st) => st.improvement30dPct)
        .filter((v): v is number => v != null);
      const lastPlayed = stats
        .map((st) => st.lastPlayedAt)
        .filter((d): d is Date => d != null)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        playerId: s.playerId,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarId: s.player.avatarId,
        active: s.player.active,
        classroomId: s.classroomId,
        birthYear: s.player.birthYear,
        gender: s.player.gender,
        totalAttempts,
        bestScore: one?.bestScore ?? null,
        avg30d: one?.avg30d ?? null,
        improvement30dPct: improvements.length
          ? Math.round((improvements.reduce((a, b) => a + b, 0) / improvements.length) * 10) / 10
          : null,
        lastPlayedAt: lastPlayed?.toISOString() ?? null,
        currentStreak: s.player.progress?.currentStreak ?? 0,
      };
    });
    res.json({ students: rows });
  }),
);

/** Alta manual de un alumno → devuelve credencial imprimible (una sola vez). */
rosterRouter.post(
  "/students",
  requireStaff(),
  validateBody(CreateStudentSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const body = req.body;
    const classroom = await assertClassroomAccess(staff, body.classroomId);
    const secret = generateSecret(body.secretType, body.firstName + body.lastName);
    const count = await prisma.studentProfile.count({ where: { classroomId: classroom.id } });

    const player = await prisma.player.create({
      data: {
        type: "STUDENT",
        displayName: displayNameOf(body.firstName, body.lastName),
        avatarId: body.avatarId ?? pickAvatar(count),
        birthYear: body.birthYear ?? null,
        gender: body.gender ?? null,
        studentProfile: {
          create: {
            institutionId: classroom.institutionId,
            classroomId: classroom.id,
            firstName: body.firstName,
            lastName: body.lastName,
            secretType: body.secretType,
            secretHash: await hashSecret(secret.plain),
          },
        },
        enrollments: { create: { classroomId: classroom.id } },
        progress: { create: {} },
      },
    });
    await audit(staff.staffId, "student.create", { playerId: player.id });

    const credential: StudentCredential = {
      playerId: player.id,
      displayName: player.displayName,
      classCode: classroom.classCode,
      secretType: body.secretType,
      secretPlain: secret.display,
    };
    res.status(201).json({ credential });
  }),
);

/** Importación CSV (filas ya parseadas/confirmadas en el cliente). */
rosterRouter.post(
  "/students/import",
  requireStaff(),
  validateBody(ImportStudentsSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const classroom = await assertClassroomAccess(staff, req.body.classroomId);
    const startCount = await prisma.studentProfile.count({ where: { classroomId: classroom.id } });

    const credentials: StudentCredential[] = [];
    for (const [i, row] of req.body.rows.entries()) {
      const secret = generateSecret("PIN4", row.firstName + row.lastName + i);
      const player = await prisma.player.create({
        data: {
          type: "STUDENT",
          displayName: displayNameOf(row.firstName, row.lastName),
          avatarId: pickAvatar(startCount + i),
          birthYear: row.birthYear ?? null,
          gender: row.gender ?? null,
          studentProfile: {
            create: {
              institutionId: classroom.institutionId,
              classroomId: classroom.id,
              firstName: row.firstName,
              lastName: row.lastName,
              secretType: "PIN4",
              secretHash: await hashSecret(secret.plain),
            },
          },
          enrollments: { create: { classroomId: classroom.id } },
          progress: { create: {} },
        },
      });
      credentials.push({
        playerId: player.id,
        displayName: player.displayName,
        classCode: classroom.classCode,
        secretType: "PIN4",
        secretPlain: secret.display,
      });
    }
    await audit(staff.staffId, "student.import", {
      classroomId: classroom.id,
      count: credentials.length,
    });
    res.status(201).json({ credentials });
  }),
);

/** Edición (nombre, avatar, desactivar — NUNCA borrar datos). */
rosterRouter.patch(
  "/students/:id",
  requireStaff(),
  validateBody(UpdateStudentSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const playerId = String(req.params["id"]);
    const profile = await prisma.studentProfile.findUnique({ where: { playerId } });
    if (!profile) throw notFound("Alumno no encontrado");
    await assertClassroomAccess(staff, profile.classroomId);
    const body = req.body;

    const firstName = body.firstName ?? profile.firstName;
    const lastName = body.lastName ?? profile.lastName;
    await prisma.$transaction([
      prisma.studentProfile.update({
        where: { playerId },
        data: { firstName, lastName },
      }),
      prisma.player.update({
        where: { id: playerId },
        data: {
          displayName: displayNameOf(firstName, lastName),
          ...(body.avatarId ? { avatarId: body.avatarId } : {}),
          ...(body.birthYear !== undefined ? { birthYear: body.birthYear } : {}),
          ...(body.gender !== undefined ? { gender: body.gender } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
      }),
    ]);
    await audit(staff.staffId, "student.update", { playerId });
    res.json({ ok: true });
  }),
);

/** Mover de curso: cierra la matriculación vigente y abre una nueva. */
rosterRouter.post(
  "/students/:id/move",
  requireStaff(),
  validateBody(MoveStudentSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const playerId = String(req.params["id"]);
    const profile = await prisma.studentProfile.findUnique({ where: { playerId } });
    if (!profile) throw notFound("Alumno no encontrado");
    await assertClassroomAccess(staff, profile.classroomId);
    const target = await assertClassroomAccess(staff, req.body.toClassroomId);
    if (target.institutionId !== profile.institutionId)
      throw forbidden("No se puede mover entre instituciones");
    if (target.id === profile.classroomId) throw badRequest("Ya está en ese curso");

    await prisma.$transaction([
      prisma.enrollment.updateMany({
        where: { playerId, toDate: null },
        data: { toDate: new Date() },
      }),
      prisma.enrollment.create({ data: { playerId, classroomId: target.id } }),
      prisma.studentProfile.update({
        where: { playerId },
        data: { classroomId: target.id },
      }),
    ]);
    await audit(staff.staffId, "student.move", { playerId, to: target.id });
    res.json({ ok: true });
  }),
);

/** Reset de clave simple: devuelve la nueva credencial imprimible. */
rosterRouter.post(
  "/students/:id/reset-secret",
  requireStaff(),
  validateBody(z.object({ secretType: z.enum(["PIN4", "PICTURE"]).optional() })),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const playerId = String(req.params["id"]);
    const profile = await prisma.studentProfile.findUnique({
      where: { playerId },
      include: { player: true, classroom: true },
    });
    if (!profile) throw notFound("Alumno no encontrado");
    await assertClassroomAccess(staff, profile.classroomId);

    const secretType = req.body.secretType ?? profile.secretType;
    const secret = generateSecret(secretType, playerId);
    await prisma.studentProfile.update({
      where: { playerId },
      data: { secretType, secretHash: await hashSecret(secret.plain) },
    });
    await audit(staff.staffId, "student.reset_secret", { playerId });

    const credential: StudentCredential = {
      playerId,
      displayName: profile.player.displayName,
      classCode: profile.classroom.classCode,
      secretType,
      secretPlain: secret.display,
    };
    res.json({ credential });
  }),
);

async function audit(staffId: string, action: string, details: object) {
  await prisma.auditLog.create({ data: { staffId, action, details } });
}
