-- CreateEnum
CREATE TYPE "ProgrammeStage" AS ENUM ('FOR_CONFIRMATION', 'AFTER_CONFIRMATION', 'MODIFIED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExamReminderKind" AS ENUM ('CONFIRM_OPEN', 'CONFIRM_CLOSING', 'TICKETS', 'WEEK_TO_GO', 'DAY_BEFORE', 'MOVED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'EXAM_DATE';

-- CreateTable
CREATE TABLE "ExamSource" (
    "id" UUID NOT NULL,
    "board" TEXT NOT NULL,
    "listUrl" TEXT NOT NULL,
    "reader" TEXT NOT NULL DEFAULT 'kerala-psc-programme',
    "linkText" TEXT NOT NULL DEFAULT 'EXAMINATION PROGRAMME',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExamSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamProgramme" (
    "id" UUID NOT NULL,
    "sourceId" UUID,
    "board" TEXT NOT NULL,
    "url" TEXT,
    "storageKey" TEXT,
    "sha256" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" DATE,
    "stage" "ProgrammeStage" NOT NULL,
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT[],
    "cancelled" TEXT[],
    "problems" TEXT[],
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDate" (
    "id" UUID NOT NULL,
    "programmeId" UUID,
    "board" TEXT NOT NULL,
    "catNo" TEXT,
    "post" TEXT NOT NULL,
    "department" TEXT,
    "scope" TEXT,
    "examOn" DATE NOT NULL,
    "timeText" TEXT,
    "confirmFrom" DATE,
    "confirmTo" DATE,
    "confirmNote" TEXT,
    "ticketsFrom" DATE,
    "mode" TEXT,
    "medium" TEXT,
    "duration" TEXT,
    "candidates" INTEGER,
    "syllabusUrl" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(6),
    "replacedAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExamDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamFollow" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "catNo" TEXT NOT NULL,
    "syllabusVersionId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamReminder" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "catNo" TEXT NOT NULL,
    "examOn" DATE NOT NULL,
    "kind" "ExamReminderKind" NOT NULL,
    "sentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamProgramme_sha256_key" ON "ExamProgramme"("sha256");

-- CreateIndex
CREATE INDEX "ExamProgramme_status_createdAt_idx" ON "ExamProgramme"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExamDate_catNo_idx" ON "ExamDate"("catNo");

-- CreateIndex
CREATE INDEX "ExamDate_publishedAt_examOn_idx" ON "ExamDate"("publishedAt", "examOn");

-- CreateIndex
CREATE INDEX "ExamFollow_catNo_idx" ON "ExamFollow"("catNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamFollow_userId_catNo_key" ON "ExamFollow"("userId", "catNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamReminder_userId_catNo_examOn_kind_key" ON "ExamReminder"("userId", "catNo", "examOn", "kind");

-- AddForeignKey
ALTER TABLE "ExamProgramme" ADD CONSTRAINT "ExamProgramme_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExamSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamDate" ADD CONSTRAINT "ExamDate_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "ExamProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamFollow" ADD CONSTRAINT "ExamFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamFollow" ADD CONSTRAINT "ExamFollow_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The Kerala PSC examinations page, watched from the start (an admin can turn it off).
INSERT INTO "ExamSource" ("id", "board", "listUrl", "updatedAt")
VALUES (gen_random_uuid(), 'Kerala PSC', 'https://www.keralapsc.gov.in/examinations', CURRENT_TIMESTAMP);
