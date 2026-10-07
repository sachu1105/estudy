-- AlterTable
ALTER TABLE "Pod" ADD COLUMN     "cover" JSONB;

-- CreateTable
CREATE TABLE "ExamCover" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syllabusVersionId" UUID NOT NULL,
    "cover" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExamCover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamCover_userId_syllabusVersionId_key" ON "ExamCover"("userId", "syllabusVersionId");

-- AddForeignKey
ALTER TABLE "ExamCover" ADD CONSTRAINT "ExamCover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCover" ADD CONSTRAINT "ExamCover_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
