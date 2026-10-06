-- CreateEnum
CREATE TYPE "StudyPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanTaskType" AS ENUM ('STUDY', 'REVISION', 'CHECK_TEST', 'SECTION_MOCK', 'FULL_MOCK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TimeWindow" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "PlanPhase" AS ENUM ('LEARN', 'REVIEW');

-- CreateTable
CREATE TABLE "PlanDraft" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlanDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syllabusVersionId" UUID,
    "title" TEXT NOT NULL,
    "status" "StudyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reviewStartDate" DATE,
    "inputs" JSONB NOT NULL,
    "leftOut" JSONB NOT NULL DEFAULT '[]',
    "availableMinutes" INTEGER NOT NULL,
    "requiredMinutes" INTEGER NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDay" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weekday" INTEGER NOT NULL,
    "phase" "PlanPhase" NOT NULL,
    "capacityMinutes" INTEGER NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "leadSubjectId" UUID,

    CONSTRAINT "PlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTask" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "dayId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "PlanTaskType" NOT NULL,
    "date" DATE NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "minutes" INTEGER NOT NULL,
    "window" "TimeWindow" NOT NULL,
    "partIndex" INTEGER,
    "partTotal" INTEGER,
    "touch" INTEGER,
    "finalReview" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "reason" JSONB NOT NULL,

    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDraft_userId_syllabusVersionId_key" ON "PlanDraft"("userId", "syllabusVersionId");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_status_idx" ON "StudyPlan"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_planId_date_key" ON "PlanDay"("planId", "date");

-- CreateIndex
CREATE INDEX "PlanTask_planId_date_idx" ON "PlanTask"("planId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTask_planId_key_key" ON "PlanTask"("planId", "key");

-- AddForeignKey
ALTER TABLE "PlanDraft" ADD CONSTRAINT "PlanDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDraft" ADD CONSTRAINT "PlanDraft_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDay" ADD CONSTRAINT "PlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- At most one active plan per exam for a user; a new plan archives the old one.
CREATE UNIQUE INDEX "StudyPlan_one_active_per_exam" ON "StudyPlan"("userId", "syllabusVersionId") WHERE "status" = 'ACTIVE';
