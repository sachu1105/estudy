-- CreateEnum
CREATE TYPE "SyllabusStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyllabusVisibility" AS ENUM ('PRIVATE', 'CATALOGUE');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('PDF', 'DOCX', 'IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "ParseJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ParseStage" AS ENUM ('QUEUED', 'READING', 'STRUCTURING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusParse" (
    "id" UUID NOT NULL,
    "fileHash" TEXT NOT NULL,
    "sourceKind" "SourceKind" NOT NULL,
    "extractedText" TEXT NOT NULL,
    "tree" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusParse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusVersion" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SyllabusStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "SyllabusVisibility" NOT NULL DEFAULT 'PRIVATE',
    "examId" UUID,
    "ownerId" UUID,
    "fileHash" TEXT,
    "sourceFileKey" TEXT,
    "sourceKind" "SourceKind",
    "sourceName" TEXT,
    "sizeBytes" INTEGER,
    "parseId" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "approvedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "SyllabusVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "foundational" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseJob" (
    "id" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "userId" UUID,
    "status" "ParseJobStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" "ParseStage" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "reused" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ParseJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "refId" UUID,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costMicros" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exam_slug_key" ON "Exam"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusParse_fileHash_key" ON "SyllabusParse"("fileHash");

-- CreateIndex
CREATE INDEX "SyllabusVersion_ownerId_deletedAt_idx" ON "SyllabusVersion"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "SyllabusVersion_visibility_status_idx" ON "SyllabusVersion"("visibility", "status");

-- CreateIndex
CREATE INDEX "SyllabusVersion_fileHash_idx" ON "SyllabusVersion"("fileHash");

-- CreateIndex
CREATE INDEX "Subject_syllabusVersionId_order_idx" ON "Subject"("syllabusVersionId", "order");

-- CreateIndex
CREATE INDEX "Topic_subjectId_order_idx" ON "Topic"("subjectId", "order");

-- CreateIndex
CREATE INDEX "ParseJob_syllabusVersionId_createdAt_idx" ON "ParseJob"("syllabusVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ParseJob_userId_createdAt_idx" ON "ParseJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_purpose_createdAt_idx" ON "AiUsage"("purpose", "createdAt");

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_parseId_fkey" FOREIGN KEY ("parseId") REFERENCES "SyllabusParse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseJob" ADD CONSTRAINT "ParseJob_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseJob" ADD CONSTRAINT "ParseJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AiUsage is a log (CLAUDE.md rule 6): never updated or deleted.
CREATE TRIGGER "AiUsage_append_only"
  BEFORE UPDATE OR DELETE ON "AiUsage"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- Weight and difficulty are 1-5 everywhere.
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_weight_range" CHECK ("weight" BETWEEN 1 AND 5);
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_difficulty_range" CHECK ("difficulty" BETWEEN 1 AND 5);
ALTER TABLE "ParseJob" ADD CONSTRAINT "ParseJob_progress_range" CHECK ("progress" BETWEEN 0 AND 100);
