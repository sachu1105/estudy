-- AlterTable
ALTER TABLE "SyllabusVersion" ADD COLUMN     "promotedFromId" UUID,
ADD COLUMN     "reviewNote" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "streakResetAt" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

