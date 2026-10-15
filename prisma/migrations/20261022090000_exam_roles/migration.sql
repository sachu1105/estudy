-- CreateEnum
CREATE TYPE "ExamRole" AS ENUM ('FOCUS', 'ALONGSIDE', 'PAUSED');

-- AlterEnum
ALTER TYPE "StudyPlanStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "StudyPlan" ADD COLUMN     "role" "ExamRole",
ADD COLUMN     "sharePercent" INTEGER;

-- CreateTable
CREATE TABLE "ExamPriority" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "role" "ExamRole" NOT NULL DEFAULT 'ALONGSIDE',
    "sharePercent" INTEGER,
    "pausedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExamPriority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamPriority_userId_role_idx" ON "ExamPriority"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPriority_userId_syllabusVersionId_key" ON "ExamPriority"("userId", "syllabusVersionId");

-- AddForeignKey
ALTER TABLE "ExamPriority" ADD CONSTRAINT "ExamPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPriority" ADD CONSTRAINT "ExamPriority_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill. Everyone studying today has been planning at the whole of their day, so record
-- that on the plans they already have; it is true, and it keeps the "Why this?" screens
-- honest for plans made before shares existed. `role` stays null on them: they were not
-- built with one.
UPDATE "StudyPlan" SET "sharePercent" = 100 WHERE "status" = 'ACTIVE';

-- The exam a user sits first leads. Ties go to the plan they made first.
INSERT INTO "ExamPriority" ("id", "userId", "syllabusVersionId", "role", "updatedAt")
SELECT DISTINCT ON (p."userId")
    gen_random_uuid(), p."userId", p."syllabusVersionId", 'FOCUS', CURRENT_TIMESTAMP
FROM "StudyPlan" p
WHERE p."status" = 'ACTIVE' AND p."syllabusVersionId" IS NOT NULL
ORDER BY p."userId", p."endDate" ASC, p."createdAt" ASC;

-- Every other exam they have a plan for runs alongside it.
INSERT INTO "ExamPriority" ("id", "userId", "syllabusVersionId", "role", "updatedAt")
SELECT DISTINCT ON (p."userId", p."syllabusVersionId")
    gen_random_uuid(), p."userId", p."syllabusVersionId", 'ALONGSIDE', CURRENT_TIMESTAMP
FROM "StudyPlan" p
WHERE p."status" = 'ACTIVE' AND p."syllabusVersionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ExamPriority" e
    WHERE e."userId" = p."userId" AND e."syllabusVersionId" = p."syllabusVersionId"
  )
ORDER BY p."userId", p."syllabusVersionId";
