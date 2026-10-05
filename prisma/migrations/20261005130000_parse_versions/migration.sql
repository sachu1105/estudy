-- DropIndex
DROP INDEX "SyllabusParse_fileHash_key";

-- AlterTable
ALTER TABLE "SyllabusParse" ADD COLUMN     "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusParse_fileHash_promptVersion_key" ON "SyllabusParse"("fileHash", "promptVersion");

