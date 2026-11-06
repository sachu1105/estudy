-- A question paper (PDF, marking, answer key) splits from the OMR sheet a person marks
-- for it, so a paper can later be shared and many people mark their own sheet for it.
-- Every existing sheet becomes a paper with the same id (old links keep working), marked
-- the PSC way (+1, -1/3) with no key yet.

-- CreateEnum
CREATE TYPE "PaperKeySource" AS ENUM ('OWN', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "CancelRule" AS ENUM ('AWARD', 'SCALE');

-- CreateTable
CREATE TABLE "Paper" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER,
    "questionCount" INTEGER NOT NULL DEFAULT 100,
    "optionCount" INTEGER NOT NULL DEFAULT 4,
    "rightNum" INTEGER NOT NULL DEFAULT 1,
    "rightDen" INTEGER NOT NULL DEFAULT 1,
    "wrongNum" INTEGER NOT NULL DEFAULT 1,
    "wrongDen" INTEGER NOT NULL DEFAULT 3,
    "cutoffNum" INTEGER,
    "cutoffDen" INTEGER,
    "limitMin" INTEGER DEFAULT 75,
    "answerKey" INTEGER[],
    "keySource" "PaperKeySource" NOT NULL DEFAULT 'OWN',
    "cancelRule" "CancelRule" NOT NULL DEFAULT 'AWARD',
    "keyUpdatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- Every sheet's paper, under the sheet's own id.
INSERT INTO "Paper" ("id", "ownerId", "title", "storageKey", "sizeBytes", "sha256", "pageCount", "answerKey", "createdAt", "updatedAt")
SELECT "id", "ownerId", "title", "storageKey", "sizeBytes", "sha256", "pageCount", array_fill(0, ARRAY[100]), "createdAt", "updatedAt"
FROM "OmrSheet";

-- DropIndex
DROP INDEX "OmrSheet_ownerId_createdAt_idx";

-- DropIndex
DROP INDEX "OmrSheet_storageKey_key";

ALTER TABLE "OmrSheet" ADD COLUMN "paperId" UUID;
UPDATE "OmrSheet" SET "paperId" = "id";
ALTER TABLE "OmrSheet" ALTER COLUMN "paperId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OmrSheet" DROP COLUMN "pageCount",
DROP COLUMN "sha256",
DROP COLUMN "sizeBytes",
DROP COLUMN "storageKey",
DROP COLUMN "title";

-- CreateTable
CREATE TABLE "OmrSubmission" (
    "id" UUID NOT NULL,
    "paperId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "marks" INTEGER[],
    "timeUsedSec" INTEGER NOT NULL,
    "limitSec" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OmrSubmission_pkey" PRIMARY KEY ("id")
);

-- Append-only (rule 6). DELETE stays allowed so a paper or an account can go.
CREATE TRIGGER "OmrSubmission_append_only"
  BEFORE UPDATE ON "OmrSubmission"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- CreateIndex
CREATE UNIQUE INDEX "Paper_storageKey_key" ON "Paper"("storageKey");

-- CreateIndex
CREATE INDEX "Paper_ownerId_createdAt_idx" ON "Paper"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "OmrSubmission_paperId_userId_createdAt_idx" ON "OmrSubmission"("paperId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "OmrSubmission_userId_createdAt_idx" ON "OmrSubmission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OmrSheet_ownerId_updatedAt_idx" ON "OmrSheet"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OmrSheet_paperId_ownerId_key" ON "OmrSheet"("paperId", "ownerId");

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OmrSheet" ADD CONSTRAINT "OmrSheet_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OmrSubmission" ADD CONSTRAINT "OmrSubmission_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OmrSubmission" ADD CONSTRAINT "OmrSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
