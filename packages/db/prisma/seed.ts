/**
 * Seed de desarrollo: institución demo, cursos, alumnos y ~30 días de
 * partidas sintéticas (reaction-time y sequence-memory) para que los
 * dashboards y rankings tengan datos desde el primer arranque.
 *
 * Idempotente: si la institución demo ya existe, no hace nada.
 */
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  getBenchmark,
  normalizeScore,
  seededRandom,
  hashString,
  levelFromTotalXp,
} from "@mentelab/benchmarks";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Julieta", "Mateo", "Sofía", "Francisco", "Emma", "Leo", "Valentina", "Thiago",
  "Olivia", "Benjamín", "Isabella", "Joaquín", "Mía", "Santiago", "Catalina", "Bruno",
  "Martina", "Felipe", "Lucía", "Simón", "Amparo", "Dante", "Renata", "Tomás",
  "Alma", "Ciro", "Josefina", "Andrés", "Clara", "Iván", "Paloma", "Gael",
];
const LAST_NAMES = [
  "Pérez", "Rodríguez", "González", "Fernández", "López", "Martínez", "Gómez",
  "Díaz", "Sosa", "Romero", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta",
];
const AVATARS = [
  "fox", "panda", "dino", "frog", "unicorn", "tiger", "owl", "koala",
  "penguin", "cat", "dog", "monkey", "lion", "bear", "rabbit", "octopus",
];

async function main() {
  const existing = await prisma.institution.findUnique({ where: { slug: "escuela-demo" } });
  if (existing) {
    console.log("✔ La institución demo ya existe. Nada que hacer.");
    return;
  }

  const passwordHash = await bcrypt.hash("mentelab-demo", 12);
  const pinHash = await bcrypt.hash("1111", 6); // clave simple, costo bajo a propósito

  const institution = await prisma.institution.create({
    data: {
      name: "Escuela Demo San Martín",
      slug: "escuela-demo",
      settings: {
        genderEnabled: false,
        studentRankingsVisible: true,
        fullLeaderboardForStudents: false,
        guestMigrationAllowed: true,
      },
    },
  });

  const year = await prisma.schoolYear.create({
    data: {
      institutionId: institution.id,
      name: "2026",
      startsAt: new Date("2026-03-01"),
      endsAt: new Date("2026-12-20"),
    },
  });

  const grades = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((level) =>
      prisma.grade.create({
        data: {
          institutionId: institution.id,
          name: `${level}° Grado`,
          level,
          typicalAge: level + 5,
        },
      }),
    ),
  );

  const classroomSpecs = [
    { grade: grades[0]!, division: "A", classCode: "SOL-42", students: 12 },
    { grade: grades[0]!, division: "B", classCode: "LUN-17", students: 10 },
    { grade: grades[1]!, division: "A", classCode: "MAR-23", students: 10 },
  ];

  const admin = await prisma.staffUser.create({
    data: {
      institutionId: institution.id,
      role: "INSTITUTION_ADMIN",
      name: "Directora Demo",
      email: "admin@demo.mentelab.ar",
      passwordHash,
    },
  });
  const teacher = await prisma.staffUser.create({
    data: {
      institutionId: institution.id,
      role: "TEACHER",
      name: "Seño Gabriela",
      email: "docente@demo.mentelab.ar",
      passwordHash,
    },
  });
  console.log(`✔ Staff: ${admin.email}, ${teacher.email} (clave: mentelab-demo)`);

  const rand = seededRandom(hashString("mentelab-seed"));
  let nameIdx = 0;
  const now = new Date();

  for (const spec of classroomSpecs) {
    const classroom = await prisma.classroom.create({
      data: {
        institutionId: institution.id,
        schoolYearId: year.id,
        gradeId: spec.grade.id,
        division: spec.division,
        classCode: spec.classCode,
      },
    });
    await prisma.teacherClassroom.create({
      data: { staffUserId: teacher.id, classroomId: classroom.id },
    });

    for (let s = 0; s < spec.students; s++) {
      const firstName = FIRST_NAMES[nameIdx % FIRST_NAMES.length]!;
      const lastName = LAST_NAMES[(nameIdx * 7) % LAST_NAMES.length]!;
      nameIdx++;
      const age = spec.grade.typicalAge;
      const player = await prisma.player.create({
        data: {
          type: "STUDENT",
          displayName: `${firstName} ${lastName[0]}.`,
          avatarId: AVATARS[nameIdx % AVATARS.length]!,
          birthYear: now.getFullYear() - age,
          studentProfile: {
            create: {
              institutionId: institution.id,
              classroomId: classroom.id,
              firstName,
              lastName,
              secretType: "PIN4",
              secretHash: pinHash,
            },
          },
          enrollments: { create: { classroomId: classroom.id } },
          progress: { create: {} },
        },
      });

      // Partidas sintéticas: 2 benchmarks, últimos 30 días, con leve mejora.
      await seedAttempts(player.id, age, institution.id, classroom.id, spec.grade.level, rand);
    }
    console.log(`✔ Curso ${spec.grade.name} ${spec.division} (${spec.classCode}): ${spec.students} alumnos`);
  }

  console.log("✔ Seed completo. PIN de todos los alumnos: 1111");
}

async function seedAttempts(
  playerId: string,
  age: number,
  institutionId: string,
  classroomId: string,
  gradeLevel: number,
  rand: () => number,
) {
  const skill = rand(); // habilidad base del alumno (0..1)
  const games = Math.floor(5 + rand() * 10);
  let totalXp = 0;
  let totalMs = 0;
  let attemptsCount = 0;

  for (const slug of ["reaction-time", "sequence-memory"] as const) {
    const def = getBenchmark(slug);
    const rows: Prisma.AttemptCreateManyInput[] = [];
    let best: number | null = null;
    let bestAt: Date | null = null;
    let bestAttemptId: string | null = null;
    const scores: number[] = [];

    for (let i = 0; i < games; i++) {
      const daysAgo = Math.floor(rand() * 30);
      const startedAt = new Date(Date.now() - daysAgo * 86_400_000 - rand() * 6 * 3_600_000);
      const progressFactor = 1 - (i / games) * 0.12; // mejora ~12% a lo largo del mes
      let score: number;
      if (slug === "reaction-time") {
        score = Math.round((560 - skill * 180) * progressFactor + rand() * 60);
      } else {
        score = Math.max(1, Math.round((3 + skill * 6) / progressFactor + rand() * 2 - 1));
      }
      scores.push(score);
      const attemptId = crypto.randomUUID();
      const isBest =
        best === null || (def.scoreDirection === "lower_better" ? score < best : score > best);
      if (isBest) {
        best = score;
        bestAt = startedAt;
        bestAttemptId = attemptId;
      }
      const durationMs = slug === "reaction-time" ? 25_000 + rand() * 10_000 : 45_000 + rand() * 40_000;
      totalMs += durationMs;
      attemptsCount++;
      totalXp += 12;

      rows.push({
        id: attemptId,
        playerId,
        benchmarkSlug: slug,
        institutionId,
        classroomId,
        gradeLevel,
        playerAge: age,
        scope: "INSTITUTIONAL",
        status: "COMPLETED",
        startedAt,
        endedAt: new Date(startedAt.getTime() + durationMs),
        durationMs: Math.round(durationMs),
        score,
        scoreNormalized: normalizeScore(score, age, def.ageReference, def.scoreDirection),
        levelReached: slug === "sequence-memory" ? score : null,
        errorCount: Math.floor(rand() * 3),
        successCount: Math.floor(3 + rand() * 5),
        metrics: { seeded: true },
        config: def.defaultConfigFor(age) as object,
        device: { deviceType: "tablet", inputType: "touch", seeded: true },
        appVersion: "seed",
      });
    }

    await prisma.attempt.createMany({ data: rows });
    if (best !== null) {
      await prisma.personalBest.create({
        data: {
          playerId,
          benchmarkSlug: slug,
          value: best,
          attemptId: bestAttemptId ?? crypto.randomUUID(),
          achievedAt: bestAt ?? new Date(),
        },
      });
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    await prisma.playerBenchmarkStats.create({
      data: {
        playerId,
        benchmarkSlug: slug,
        totalAttempts: games,
        totalPlayMs: totalMs / 2,
        bestScore: best,
        bestAt,
        avgAllTime: Math.round(avg * 10) / 10,
        avg30d: Math.round(avg * 10) / 10,
        improvement30dPct: Math.round(rand() * 15 * 10) / 10,
        lastPlayedAt: new Date(),
      },
    });
  }

  const lv = levelFromTotalXp(totalXp);
  await prisma.playerProgress.update({
    where: { playerId },
    data: {
      xp: totalXp,
      level: lv.level,
      currentStreak: Math.floor(rand() * 5),
      longestStreak: Math.floor(3 + rand() * 8),
      lastPlayedDate: new Date(),
      totalAttempts: attemptsCount,
      totalPlayMs: totalMs,
    },
  });
  await prisma.xpTransaction.create({
    data: { playerId, amount: totalXp, reason: "seed_backfill" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
