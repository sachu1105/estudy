-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarKey" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "profileCover" JSONB,
ADD COLUMN     "profilePublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
