-- CreateEnum
CREATE TYPE "ChannelViewRule" AS ENUM ('EVERYONE', 'ADMINS', 'PICKED');

-- CreateEnum
CREATE TYPE "NotifyLevel" AS ENUM ('ALL', 'MENTIONS', 'MUTE');

-- AlterEnum
ALTER TYPE "GroupRole" ADD VALUE 'MODERATOR';

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "slowModeSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewRule" "ChannelViewRule" NOT NULL DEFAULT 'EVERYONE';

-- CreateTable
CREATE TABLE "ChannelAccess" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelNotify" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "level" "NotifyLevel" NOT NULL,

    CONSTRAINT "ChannelNotify_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelAccess_userId_idx" ON "ChannelAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccess_channelId_userId_key" ON "ChannelAccess"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelNotify_userId_channelId_key" ON "ChannelNotify"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "ChannelAccess" ADD CONSTRAINT "ChannelAccess_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAccess" ADD CONSTRAINT "ChannelAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelNotify" ADD CONSTRAINT "ChannelNotify_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelNotify" ADD CONSTRAINT "ChannelNotify_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

