import { z } from "zod";
import { StaffRole } from "./enums";

/** Alumno visible en la grilla de login de su curso. */
export const ClassRosterEntrySchema = z.object({
  playerId: z.string().uuid(),
  displayName: z.string(),
  avatarId: z.string(),
  secretType: z.enum(["PIN4", "PICTURE"]),
});
export type ClassRosterEntry = z.infer<typeof ClassRosterEntrySchema>;

export const ClassLookupResponseSchema = z.object({
  classroomId: z.string().uuid(),
  classCode: z.string(),
  label: z.string(), // "1° A — Escuela San Martín"
  institutionName: z.string(),
  students: z.array(ClassRosterEntrySchema),
});
export type ClassLookupResponse = z.infer<typeof ClassLookupResponseSchema>;

export const StudentLoginSchema = z.object({
  playerId: z.string().uuid(),
  /** PIN de 4 dígitos ("4821") o secuencia de 3 imágenes ("apple,ball,rocket"). */
  secret: z.string().min(3).max(120),
});
export type StudentLoginInput = z.infer<typeof StudentLoginSchema>;

export const StaffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type StaffLoginInput = z.infer<typeof StaffLoginSchema>;

export const GuestInitSchema = z.object({
  deviceUuid: z.string().uuid(),
  alias: z.string().min(2).max(24).optional(),
});
export type GuestInitInput = z.infer<typeof GuestInitSchema>;

/** Principal autenticado (contenido del JWT). */
export const PrincipalSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("student"),
    playerId: z.string().uuid(),
    institutionId: z.string().uuid(),
    classroomId: z.string().uuid(),
    displayName: z.string(),
  }),
  z.object({
    kind: z.literal("staff"),
    staffId: z.string().uuid(),
    role: StaffRole,
    institutionId: z.string().uuid().nullable(),
    name: z.string(),
  }),
  z.object({
    kind: z.literal("guest"),
    playerId: z.string().uuid(),
    displayName: z.string(),
  }),
]);
export type Principal = z.infer<typeof PrincipalSchema>;
