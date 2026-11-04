-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'FRIEND_REQUEST';
ALTER TYPE "NotificationKind" ADD VALUE 'FRIEND_ACCEPTED';

-- CreateTable
CREATE TABLE "Friendship" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectThread" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "lastMessageAt" TIMESTAMPTZ(6) NOT NULL,
    "readA" TIMESTAMPTZ(6),
    "readB" TIMESTAMPTZ(6),

    CONSTRAINT "DirectThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Friendship_userBId_idx" ON "Friendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "DirectThread_userAId_lastMessageAt_idx" ON "DirectThread"("userAId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "DirectThread_userBId_lastMessageAt_idx" ON "DirectThread"("userBId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectThread_userAId_userBId_key" ON "DirectThread"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A pair is stored once, the smaller id first.
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_pair_order" CHECK ("userAId" < "userBId");
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_pair_order" CHECK ("userAId" < "userBId");

-- Everyone gets a username so friends can add them: the name they go by, plus a bit of
-- their id to keep it unique. The public profile stays off (profilePublic is untouched).
UPDATE "User"
SET "handle" = rtrim(left(coalesce(nullif(trim(both '_' from regexp_replace(lower("displayName"), '[^a-z0-9]+', '_', 'g')), ''), 'study'), 16), '_')
  || '_' || substr(replace("id"::text, '-', ''), 1, 6)
WHERE "handle" IS NULL;
