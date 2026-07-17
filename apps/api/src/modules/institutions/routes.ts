import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@mentelab/db";
import { asyncHandler, badRequest, forbidden, notFound } from "../../core/errors";
import { validateBody } from "../../core/validate";
import { requireStaff, staffOf } from "../../core/auth";
import { generateClassCode } from "../roster/service";

export const institutionsRouter: ReturnType<typeof Router> = Router();

/** Estructura de mi institución (grados, años, cursos) para el panel. */
institutionsRouter.get(
  "/mine",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw badRequest("Super admin: usá /institutions");
    const institution = await prisma.institution.findUnique({
      where: { id: staff.institutionId },
      include: {
        grades: { orderBy: { level: "asc" } },
        schoolYears: { orderBy: { name: "desc" } },
        classrooms: {
          where: { active: true },
          include: { grade: true, schoolYear: true, _count: { select: { students: true } } },
        },
      },
    });
    if (!institution) throw notFound();
    res.json({ institution });
  }),
);

const CreateGradeSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().int().min(1).max(12),
  typicalAge: z.number().int().min(4).max(20),
});

institutionsRouter.post(
  "/grades",
  requireStaff("INSTITUTION_ADMIN"),
  validateBody(CreateGradeSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw forbidden();
    const grade = await prisma.grade.create({
      data: { institutionId: staff.institutionId, ...req.body },
    });
    res.status(201).json({ grade });
  }),
);

const CreateYearSchema = z.object({
  name: z.string().min(2).max(20),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

institutionsRouter.post(
  "/school-years",
  requireStaff("INSTITUTION_ADMIN"),
  validateBody(CreateYearSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw forbidden();
    const year = await prisma.schoolYear.create({
      data: { institutionId: staff.institutionId, ...req.body },
    });
    res.status(201).json({ year });
  }),
);

const CreateClassroomSchema = z.object({
  gradeId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
  division: z.string().min(1).max(10),
  teacherIds: z.array(z.string().uuid()).default([]),
});

institutionsRouter.post(
  "/classrooms",
  requireStaff("INSTITUTION_ADMIN"),
  validateBody(CreateClassroomSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw forbidden();
    const [grade, year] = await Promise.all([
      prisma.grade.findUnique({ where: { id: req.body.gradeId } }),
      prisma.schoolYear.findUnique({ where: { id: req.body.schoolYearId } }),
    ]);
    if (!grade || grade.institutionId !== staff.institutionId) throw badRequest("Grado inválido");
    if (!year || year.institutionId !== staff.institutionId) throw badRequest("Año inválido");

    const classroom = await prisma.classroom.create({
      data: {
        institutionId: staff.institutionId,
        gradeId: grade.id,
        schoolYearId: year.id,
        division: req.body.division.toUpperCase(),
        classCode: await generateClassCode(),
        teachers: {
          create: req.body.teacherIds.map((staffUserId: string) => ({ staffUserId })),
        },
      },
    });
    res.status(201).json({ classroom });
  }),
);

/** Docentes de mi institución (para asignar cursos). */
institutionsRouter.get(
  "/staff",
  requireStaff("INSTITUTION_ADMIN"),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const users = await prisma.staffUser.findMany({
      where: { institutionId: staff.institutionId ?? undefined },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    });
    res.json({ staff: users });
  }),
);

const CreateStaffSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(10).max(100),
  role: z.enum(["TEACHER", "INSTITUTION_ADMIN"]),
  classroomIds: z.array(z.string().uuid()).default([]),
});

institutionsRouter.post(
  "/staff",
  requireStaff("INSTITUTION_ADMIN"),
  validateBody(CreateStaffSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    if (!staff.institutionId) throw forbidden();
    const user = await prisma.staffUser.create({
      data: {
        institutionId: staff.institutionId,
        name: req.body.name,
        email: req.body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(req.body.password, 12),
        role: req.body.role,
        classrooms: {
          create: req.body.classroomIds.map((classroomId: string) => ({ classroomId })),
        },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json({ staff: user });
  }),
);

// ── Super admin: crear instituciones con su primer admin ────────────

const CreateInstitutionSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  adminName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(10).max(100),
});

institutionsRouter.get(
  "/",
  requireStaff("SUPER_ADMIN"),
  asyncHandler(async (_req, res) => {
    const institutions = await prisma.institution.findMany({
      include: { _count: { select: { students: true, classrooms: true, staff: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ institutions });
  }),
);

institutionsRouter.post(
  "/",
  requireStaff("SUPER_ADMIN"),
  validateBody(CreateInstitutionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const institution = await prisma.institution.create({
      data: {
        name: body.name,
        slug: body.slug,
        staff: {
          create: {
            role: "INSTITUTION_ADMIN",
            name: body.adminName,
            email: body.adminEmail.toLowerCase(),
            passwordHash: await bcrypt.hash(body.adminPassword, 12),
          },
        },
      },
    });
    res.status(201).json({ institution });
  }),
);
