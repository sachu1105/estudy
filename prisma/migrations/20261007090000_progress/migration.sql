-- CreateEnum
CREATE TYPE "XpKind" AS ENUM ('STUDY', 'TASK', 'STREAK');

-- CreateEnum
CREATE TYPE "OverrideKind" AS ENUM ('MOVE', 'RESIZE', 'LOCK', 'CUSTOM');

-- AlterTable
ALTER TABLE "StudyPlan" ADD COLUMN     "adjustments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "diffSeenAt" TIMESTAMPTZ(6),
ADD COLUMN     "replanDiff" JSONB,
ADD COLUMN     "replanWarning" JSONB;

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "taskKey" TEXT NOT NULL,
    "type" "PlanTaskType" NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "minutes" INTEGER NOT NULL,
    "localDate" DATE NOT NULL,
    "done" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID,
    "taskId" UUID,
    "subjectId" UUID,
    "topicId" UUID,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "endedAt" TIMESTAMPTZ(6) NOT NULL,
    "activeMinutes" INTEGER NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "lastBeatAt" TIMESTAMPTZ(6) NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "XpKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "refId" UUID,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanOverride" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "taskKey" TEXT NOT NULL,
    "kind" "OverrideKind" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlanOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCompletion_userId_taskId_createdAt_idx" ON "TaskCompletion"("userId", "taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskCompletion_userId_localDate_idx" ON "TaskCompletion"("userId", "localDate");

-- CreateIndex
CREATE INDEX "StudySession_userId_localDate_idx" ON "StudySession"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveSession_userId_key" ON "ActiveSession"("userId");

-- CreateIndex
CREATE INDEX "XpLedger_userId_localDate_idx" ON "XpLedger"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlanOverride_userId_syllabusVersionId_taskKey_key" ON "PlanOverride"("userId", "syllabusVersionId", "taskKey");

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveSession" ADD CONSTRAINT "ActiveSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanOverride" ADD CONSTRAINT "PlanOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The progress logs are append-only (rule 6).
CREATE TRIGGER "TaskCompletion_append_only"
  BEFORE UPDATE OR DELETE ON "TaskCompletion"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "StudySession_append_only"
  BEFORE UPDATE OR DELETE ON "StudySession"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "XpLedger_append_only"
  BEFORE UPDATE OR DELETE ON "XpLedger"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
