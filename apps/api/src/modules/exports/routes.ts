import { Router } from "express";
import ExcelJS from "exceljs";
import { prisma } from "@mentelab/db";
import { AnalyticsFilterSchema, type AnalyticsFilter } from "@mentelab/shared";
import { asyncHandler, badRequest, forbidden } from "../../core/errors";
import { validateQuery, getQuery } from "../../core/validate";
import { requireStaff, staffOf } from "../../core/auth";
import { assertClassroomAccess } from "../roster/service";

export const exportsRouter: ReturnType<typeof Router> = Router();

const HEADERS = [
  "fecha",
  "hora",
  "alumno",
  "curso",
  "benchmark",
  "estado",
  "score",
  "score_normalizado",
  "nivel",
  "errores",
  "aciertos",
  "duracion_ms",
  "foco_perdido",
  "pausas",
  "fps_promedio",
  "dispositivo",
  "metricas_json",
] as const;

type ExportRow = Record<(typeof HEADERS)[number], string | number>;

async function* exportRows(
  staff: { institutionId: string | null; role: string; staffId: string },
  f: AnalyticsFilter,
): AsyncGenerator<ExportRow> {
  if (!staff.institutionId) throw forbidden();
  const where: Record<string, unknown> = {
    scope: "INSTITUTIONAL",
    institutionId: staff.institutionId,
    status: { in: ["COMPLETED", "INVALID"] },
  };
  if (f.classroomId) where["classroomId"] = f.classroomId;
  if (f.benchmark) where["benchmarkSlug"] = f.benchmark;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[f.period as string];
  if (days) where["startedAt"] = { gte: new Date(Date.now() - days * 86_400_000) };
  if (f.cleanOnly) {
    where["focusLostCount"] = 0;
    where["status"] = "COMPLETED";
  }

  // Streaming por cursor: nunca cargar todo en memoria (doc 08).
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.attempt.findMany({
      where,
      include: {
        player: { include: { studentProfile: { include: { classroom: { include: { grade: true } } } } } },
      },
      orderBy: { startedAt: "desc" },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;
    for (const a of page) {
      const sp = a.player.studentProfile;
      const device = (a.device ?? {}) as { deviceType?: string };
      yield {
        fecha: a.startedAt.toISOString().slice(0, 10),
        hora: a.startedAt.toISOString().slice(11, 19),
        alumno: sp ? `${sp.lastName}, ${sp.firstName}` : a.player.displayName,
        curso: sp ? `${sp.classroom.grade.name} ${sp.classroom.division}` : "",
        benchmark: a.benchmarkSlug,
        estado: a.status,
        score: a.score ?? "",
        score_normalizado: a.scoreNormalized ?? "",
        nivel: a.levelReached ?? "",
        errores: a.errorCount ?? "",
        aciertos: a.successCount ?? "",
        duracion_ms: a.durationMs ?? "",
        foco_perdido: a.focusLostCount,
        pausas: a.pauseCount,
        fps_promedio: a.avgFps ?? "",
        dispositivo: device.deviceType ?? "",
        metricas_json: JSON.stringify(a.metrics ?? {}),
      };
    }
    cursor = page[page.length - 1]!.id;
    if (page.length < 500) break;
  }
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

exportsRouter.get(
  "/attempts.csv",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    if (f.classroomId) await assertClassroomAccess(staff, f.classroomId);
    await prisma.auditLog.create({
      data: { staffId: staff.staffId, action: "export.csv", details: f as object },
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mentelab-intentos.csv"`);
    res.write("﻿" + HEADERS.join(",") + "\n"); // BOM para Excel
    for await (const row of exportRows(staff, f)) {
      res.write(HEADERS.map((h) => csvEscape(row[h])).join(",") + "\n");
    }
    res.end();
  }),
);

exportsRouter.get(
  "/attempts.xlsx",
  requireStaff(),
  validateQuery(AnalyticsFilterSchema),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const f = getQuery<AnalyticsFilter>(req);
    if (f.classroomId) await assertClassroomAccess(staff, f.classroomId);
    await prisma.auditLog.create({
      data: { staffId: staff.staffId, action: "export.xlsx", details: f as object },
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="mentelab-intentos.xlsx"`);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const sheet = workbook.addWorksheet("Intentos");
    sheet.addRow([...HEADERS]).commit();
    for await (const row of exportRows(staff, f)) {
      sheet.addRow(HEADERS.map((h) => row[h])).commit();
    }
    sheet.commit();
    await workbook.commit();
  }),
);

/** Exportación de eventos crudos de un intento (análisis profundo). */
exportsRouter.get(
  "/attempts/:id/events.csv",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const staff = staffOf(req);
    const attempt = await prisma.attempt.findUnique({
      where: { id: String(req.params["id"]) },
      include: { events: { orderBy: { seq: "asc" } } },
    });
    if (!attempt) throw badRequest("Intento no encontrado");
    if (staff.role !== "SUPER_ADMIN" && attempt.institutionId !== staff.institutionId)
      throw forbidden();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="eventos-${attempt.id}.csv"`);
    res.write("﻿seq,t_ms,tipo,payload\n");
    for (const e of attempt.events) {
      res.write(`${e.seq},${e.tMs},${e.type},${csvEscape(JSON.stringify(e.payload ?? {}))}\n`);
    }
    res.end();
  }),
);
