-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('AI', 'PYQ', 'ADMIN', 'USER', 'MATERIAL');

-- CreateEnum
CREATE TYPE "QuestionLanguage" AS ENUM ('EN', 'ML');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('WRONG_ANSWER', 'UNCLEAR', 'TYPO', 'OTHER');

-- CreateEnum
CREATE TYPE "MockTestType" AS ENUM ('CHECK', 'SECTION', 'FULL', 'CUSTOM', 'MATERIAL');

-- AlterTable
ALTER TABLE "TaskCompletion" ADD COLUMN     "accuracy" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "topicId" UUID,
    "topicKey" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "language" "QuestionLanguage" NOT NULL DEFAULT 'EN',
    "body" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "source" "QuestionSource" NOT NULL,
    "sourceRef" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionReport" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(6),

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "MockTestType" NOT NULL,
    "title" TEXT NOT NULL,
    "syllabusVersionId" UUID,
    "subjectId" UUID,
    "topicId" UUID,
    "planTaskId" UUID,
    "questionIds" UUID[],
    "durationSec" INTEGER,
    "negativeMarking" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mockTestId" UUID NOT NULL,
    "type" "MockTestType" NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "topicKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "chosenIndex" INTEGER,
    "correct" BOOLEAN NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_topicKey_status_idx" ON "Question"("topicKey", "status");

-- CreateIndex
CREATE INDEX "Question_topicId_status_idx" ON "Question"("topicId", "status");

-- CreateIndex
CREATE INDEX "Question_status_reportCount_idx" ON "Question"("status", "reportCount");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReport_questionId_userId_key" ON "QuestionReport"("questionId", "userId");

-- CreateIndex
CREATE INDEX "MockTest_userId_createdAt_idx" ON "MockTest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MockTest_userId_planTaskId_idx" ON "MockTest"("userId", "planTaskId");

-- CreateIndex
CREATE INDEX "TestAttempt_userId_createdAt_idx" ON "TestAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TestAttempt_userId_topicId_idx" ON "TestAttempt"("userId", "topicId");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_position_idx" ON "AttemptAnswer"("attemptId", "position");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTest" ADD CONSTRAINT "MockTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Test attempts are logs (rule 6).
CREATE TRIGGER "TestAttempt_append_only"
  BEFORE UPDATE OR DELETE ON "TestAttempt"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "AttemptAnswer_append_only"
  BEFORE UPDATE OR DELETE ON "AttemptAnswer"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- Exactly four options, and the answer is one of them.
ALTER TABLE "Question" ADD CONSTRAINT "Question_four_options"
  CHECK (cardinality(options) = 4 AND "correctIndex" BETWEEN 0 AND 3);
