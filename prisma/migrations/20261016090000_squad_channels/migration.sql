-- CreateEnum
CREATE TYPE "SquadJoinMode" AS ENUM ('OPEN', 'REQUEST', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('CHAT', 'THREADS', 'MATERIAL', 'LINKS', 'TESTS', 'ANNOUNCEMENTS');

-- CreateEnum
CREATE TYPE "ChannelPostRule" AS ENUM ('EVERYONE', 'ADMINS');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "joinMode" "SquadJoinMode" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "joinQuestion" TEXT;

-- Private squads asked to join before join modes existed: keep it that way.
UPDATE "Group" SET "joinMode" = 'REQUEST' WHERE "visibility" = 'PRIVATE';

-- AlterTable
ALTER TABLE "GroupItem" ADD COLUMN     "channelId" UUID;

-- AlterTable
ALTER TABLE "GroupTest" ADD COLUMN     "channelId" UUID;

-- AlterTable
ALTER TABLE "JoinRequest" ADD COLUMN     "answer" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "channelId" UUID;

-- CreateTable
CREATE TABLE "ChannelCategory" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "categoryId" UUID,
    "type" "ChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "postRule" "ChannelPostRule" NOT NULL DEFAULT 'EVERYONE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- Backfill: every squad gets the exam squad channels (src/lib/squads/templates.ts),
-- and what it already had moves into them, so nothing is lost.
INSERT INTO "ChannelCategory" ("id", "groupId", "name", "order")
SELECT gen_random_uuid(), g."id", c."name", c."ord"
FROM "Group" g
CROSS JOIN (VALUES ('Info', 0), ('General', 1), ('Library', 2)) AS c("name", "ord");

INSERT INTO "Channel" ("id", "groupId", "categoryId", "type", "name", "topic", "order", "postRule", "updatedAt")
SELECT gen_random_uuid(), g."id", cat."id", v."type"::"ChannelType", v."name", v."topic", v."ord", v."rule"::"ChannelPostRule", CURRENT_TIMESTAMP
FROM "Group" g
CROSS JOIN (VALUES
  ('Info', 'ANNOUNCEMENTS', 'announcements', 'News from the squad''s admins', 0, 'ADMINS'),
  ('General', 'CHAT', 'general', 'Talk about anything to do with the exam', 0, 'EVERYONE'),
  ('General', 'THREADS', 'doubts', 'Ask a question, answer one', 1, 'EVERYONE'),
  ('Library', 'MATERIAL', 'material', 'Notes, PDFs and photos shared from pods', 0, 'EVERYONE'),
  ('Library', 'LINKS', 'links', 'Websites worth studying from', 1, 'EVERYONE'),
  ('Library', 'TESTS', 'mock-tests', 'Mock tests to take together', 2, 'EVERYONE')
) AS v("cat", "type", "name", "topic", "ord", "rule")
JOIN "ChannelCategory" cat ON cat."groupId" = g."id" AND cat."name" = v."cat";

UPDATE "GroupItem" i SET "channelId" = c."id"
FROM "Channel" c
WHERE c."groupId" = i."groupId"
  AND c."type" = (CASE WHEN i."type" = 'LINK' THEN 'LINKS' ELSE 'MATERIAL' END)::"ChannelType";

UPDATE "GroupTest" t SET "channelId" = c."id"
FROM "Channel" c
WHERE c."groupId" = t."groupId" AND c."type" = 'TESTS';

UPDATE "Post" p SET "channelId" = c."id"
FROM "Channel" c
WHERE c."groupId" = p."groupId" AND c."type" = 'THREADS';

ALTER TABLE "GroupItem" ALTER COLUMN "channelId" SET NOT NULL;
ALTER TABLE "GroupTest" ALTER COLUMN "channelId" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "channelId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChannelCategory_groupId_order_idx" ON "ChannelCategory"("groupId", "order");

-- CreateIndex
CREATE INDEX "Channel_groupId_deletedAt_order_idx" ON "Channel"("groupId", "deletedAt", "order");

-- CreateIndex
CREATE INDEX "GroupItem_channelId_deletedAt_createdAt_idx" ON "GroupItem"("channelId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "GroupTest_channelId_createdAt_idx" ON "GroupTest"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_channelId_deletedAt_lastActivityAt_idx" ON "Post"("channelId", "deletedAt", "lastActivityAt");

-- AddForeignKey
ALTER TABLE "ChannelCategory" ADD CONSTRAINT "ChannelCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChannelCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupItem" ADD CONSTRAINT "GroupItem_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTest" ADD CONSTRAINT "GroupTest_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

