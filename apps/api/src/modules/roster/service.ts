import bcrypt from "bcryptjs";
import { prisma } from "@mentelab/db";
import { seededRandom, hashString } from "@mentelab/benchmarks";
import { PICTURE_KEY_IDS, AVATAR_IDS, type Principal } from "@mentelab/shared";
import { forbidden, notFound } from "../../core/errors";

type Staff = Extract<Principal, { kind: "staff" }>;

/** Un docente solo opera sobre sus cursos; un admin sobre toda su institución. */
export async function assertClassroomAccess(staff: Staff, classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw notFound("Curso no encontrado");
  if (staff.role === "SUPER_ADMIN") return classroom;
  if (classroom.institutionId !== staff.institutionId) throw forbidden();
  if (staff.role === "TEACHER") {
    const assigned = await prisma.teacherClassroom.findUnique({
      where: { staffUserId_classroomId: { staffUserId: staff.staffId, classroomId } },
    });
    if (!assigned) throw forbidden("No tenés asignado este curso");
  }
  return classroom;
}

/** Código de clase memorable: PALABRA-NN (ej: SOL-42). */
const CODE_WORDS = [
  "SOL", "LUN", "MAR", "RIO", "MAR", "PEZ", "OSO", "LEO", "PAN", "FLOR",
  "NUBE", "LUZ", "MIEL", "COCO", "KIWI", "LIMA", "PUMA", "TERO", "YACU", "CEIBO",
];

export async function generateClassCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]!;
    const num = 10 + Math.floor(Math.random() * 90);
    const code = `${word}-${num}`;
    const exists = await prisma.classroom.findUnique({ where: { classCode: code } });
    if (!exists) return code;
  }
  return `AULA-${Date.now() % 10000}`;
}

/** Genera la clave simple inicial de un alumno (PIN o secuencia de imágenes). */
export function generateSecret(secretType: "PIN4" | "PICTURE", seedKey: string) {
  const rand = seededRandom(hashString(seedKey + Date.now()));
  if (secretType === "PIN4") {
    const pin = String(1000 + Math.floor(rand() * 9000));
    return { plain: pin, display: pin };
  }
  const shuffled = [...PICTURE_KEY_IDS].sort(() => rand() - 0.5).slice(0, 3);
  return { plain: shuffled.join(","), display: shuffled.join(",") };
}

export async function hashSecret(plain: string): Promise<string> {
  // Costo bajo a propósito: secreto de baja entropía por diseño (doc 07 §1);
  // la defensa real es el rate limit + reseteo docente.
  return bcrypt.hash(plain, 6);
}

export function pickAvatar(index: number): string {
  return AVATAR_IDS[index % AVATAR_IDS.length]!;
}

/** "Juli P." — nombre visible sin apellido completo (privacidad, doc 07 §4). */
export function displayNameOf(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}
