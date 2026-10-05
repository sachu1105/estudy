-- AlterTable
ALTER TABLE "SyllabusParse" ADD COLUMN     "copiedFromId" UUID,
ADD COLUMN     "minhash" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "post" TEXT;

-- CreateTable
CREATE TABLE "SectionCache" (
    "key" TEXT NOT NULL,
    "subjects" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionCache_pkey" PRIMARY KEY ("key")
);

