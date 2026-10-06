
-- CreateEnum
CREATE TYPE "PodStage" AS ENUM ('TO_STUDY', 'STUDYING', 'REVISING', 'DONE');

-- AlterTable
ALTER TABLE "Pod" ADD COLUMN     "stage" "PodStage" NOT NULL DEFAULT 'TO_STUDY',
ADD COLUMN     "stageOrder" INTEGER NOT NULL DEFAULT 0;


-- Existing pods keep their syllabus order on the board.
UPDATE "Pod" SET "stageOrder" = "order";
