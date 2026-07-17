import { z } from "zod";
import { Gender, SecretType } from "./enums";

export const CreateStudentSchema = z.object({
  classroomId: z.string().uuid(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  birthYear: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() - 3)
    .optional(),
  gender: Gender.optional(),
  avatarId: z.string().max(32).optional(),
  secretType: SecretType.default("PIN4"),
});
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const ImportStudentsSchema = z.object({
  classroomId: z.string().uuid(),
  /** Filas ya parseadas del CSV en el cliente (preview confirmada). */
  rows: z
    .array(
      z.object({
        firstName: z.string().min(1).max(60),
        lastName: z.string().min(1).max(60),
        birthYear: z.number().int().optional(),
        gender: Gender.optional(),
      }),
    )
    .min(1)
    .max(500),
});
export type ImportStudentsInput = z.infer<typeof ImportStudentsSchema>;

export const UpdateStudentSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  birthYear: z.number().int().optional(),
  gender: Gender.nullable().optional(),
  avatarId: z.string().max(32).optional(),
  active: z.boolean().optional(),
});
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

export const MoveStudentSchema = z.object({
  toClassroomId: z.string().uuid(),
});
export type MoveStudentInput = z.infer<typeof MoveStudentSchema>;

/** Credencial imprimible generada al crear/resetear la clave de un alumno. */
export const StudentCredentialSchema = z.object({
  playerId: z.string().uuid(),
  displayName: z.string(),
  classCode: z.string(),
  secretType: SecretType,
  /** El secreto EN CLARO — solo se devuelve una vez, para imprimir. */
  secretPlain: z.string(),
});
export type StudentCredential = z.infer<typeof StudentCredentialSchema>;
