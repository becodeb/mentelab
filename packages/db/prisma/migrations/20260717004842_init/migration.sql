-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('STUDENT', 'GUEST');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('TEACHER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('F', 'M', 'X');

-- CreateEnum
CREATE TYPE "SecretType" AS ENUM ('PIN4', 'PICTURE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'INVALID');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('INSTITUTIONAL', 'GLOBAL');

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_years" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "school_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "typicalAge" INTEGER NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "schoolYearId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "division" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "institutionId" UUID,
    "role" "StaffRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_classrooms" (
    "staffUserId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,

    CONSTRAINT "teacher_classrooms_pkey" PRIMARY KEY ("staffUserId","classroomId")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "type" "PlayerType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL DEFAULT 'fox',
    "birthYear" INTEGER,
    "gender" "Gender",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "playerId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "secretType" "SecretType" NOT NULL DEFAULT 'PIN4',
    "secretHash" TEXT NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toDate" TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profiles" (
    "playerId" UUID NOT NULL,
    "deviceUuid" TEXT NOT NULL,
    "alias" TEXT,
    "migratedToId" UUID,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "benchmarkSlug" TEXT NOT NULL,
    "institutionId" UUID,
    "classroomId" UUID,
    "gradeLevel" INTEGER,
    "playerAge" INTEGER,
    "scope" "DataScope" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "score" DOUBLE PRECISION,
    "scoreNormalized" DOUBLE PRECISION,
    "levelReached" INTEGER,
    "errorCount" INTEGER,
    "successCount" INTEGER,
    "metrics" JSONB,
    "config" JSONB NOT NULL,
    "focusLostCount" INTEGER NOT NULL DEFAULT 0,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "avgFps" DOUBLE PRECISION,
    "device" JSONB,
    "sessionId" UUID,
    "appVersion" TEXT,
    "invalidReason" TEXT,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_events" (
    "attemptId" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "tMs" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,

    CONSTRAINT "attempt_events_pkey" PRIMARY KEY ("attemptId","seq")
);

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "device" JSONB,

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_benchmark_stats" (
    "playerId" UUID NOT NULL,
    "benchmarkSlug" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalPlayMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestScore" DOUBLE PRECISION,
    "bestAt" TIMESTAMP(3),
    "avgAllTime" DOUBLE PRECISION,
    "avg30d" DOUBLE PRECISION,
    "consistency30d" DOUBLE PRECISION,
    "improvement30dPct" DOUBLE PRECISION,
    "lastPlayedAt" TIMESTAMP(3),

    CONSTRAINT "player_benchmark_stats_pkey" PRIMARY KEY ("playerId","benchmarkSlug")
);

-- CreateTable
CREATE TABLE "personal_bests" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "benchmarkSlug" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'score',
    "value" DOUBLE PRECISION NOT NULL,
    "attemptId" UUID NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_bests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_progress" (
    "playerId" UUID NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedDate" DATE,
    "graceUsedOn" DATE,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalPlayMs" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "player_progress_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_badges" (
    "playerId" UUID NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refId" TEXT,

    CONSTRAINT "player_badges_pkey" PRIMARY KEY ("playerId","badgeCode")
);

-- CreateTable
CREATE TABLE "player_missions" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "missionCode" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "player_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cognitive_scores" (
    "playerId" UUID NOT NULL,
    "indicator" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "windowEnd" DATE NOT NULL,

    CONSTRAINT "cognitive_scores_pkey" PRIMARY KEY ("playerId","indicator","windowEnd")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" UUID NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rankings" JSONB NOT NULL,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "school_years_institutionId_name_key" ON "school_years"("institutionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "grades_institutionId_level_key" ON "grades"("institutionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_classCode_key" ON "classrooms"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_institutionId_schoolYearId_gradeId_division_key" ON "classrooms"("institutionId", "schoolYearId", "gradeId", "division");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE INDEX "student_profiles_institutionId_idx" ON "student_profiles"("institutionId");

-- CreateIndex
CREATE INDEX "student_profiles_classroomId_idx" ON "student_profiles"("classroomId");

-- CreateIndex
CREATE INDEX "enrollments_playerId_idx" ON "enrollments"("playerId");

-- CreateIndex
CREATE INDEX "enrollments_classroomId_idx" ON "enrollments"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_profiles_deviceUuid_key" ON "guest_profiles"("deviceUuid");

-- CreateIndex
CREATE INDEX "attempts_playerId_benchmarkSlug_startedAt_idx" ON "attempts"("playerId", "benchmarkSlug", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "attempts_institutionId_benchmarkSlug_startedAt_idx" ON "attempts"("institutionId", "benchmarkSlug", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "attempts_classroomId_benchmarkSlug_startedAt_idx" ON "attempts"("classroomId", "benchmarkSlug", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "attempts_scope_benchmarkSlug_startedAt_idx" ON "attempts"("scope", "benchmarkSlug", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "play_sessions_playerId_startedAt_idx" ON "play_sessions"("playerId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "personal_bests_playerId_benchmarkSlug_achievedAt_idx" ON "personal_bests"("playerId", "benchmarkSlug", "achievedAt" DESC);

-- CreateIndex
CREATE INDEX "xp_transactions_playerId_createdAt_idx" ON "xp_transactions"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "player_missions_playerId_date_idx" ON "player_missions"("playerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "player_missions_playerId_missionCode_date_key" ON "player_missions"("playerId", "missionCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshots_scopeKey_date_key" ON "leaderboard_snapshots"("scopeKey", "date");

-- CreateIndex
CREATE INDEX "audit_logs_staffId_createdAt_idx" ON "audit_logs"("staffId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_classrooms" ADD CONSTRAINT "teacher_classrooms_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_classrooms" ADD CONSTRAINT "teacher_classrooms_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "play_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_benchmark_stats" ADD CONSTRAINT "player_benchmark_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_bests" ADD CONSTRAINT "personal_bests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_progress" ADD CONSTRAINT "player_progress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_badges" ADD CONSTRAINT "player_badges_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_missions" ADD CONSTRAINT "player_missions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cognitive_scores" ADD CONSTRAINT "cognitive_scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
