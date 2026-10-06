-- CreateEnum
CREATE TYPE "PodKind" AS ENUM ('SUBJECT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PodItemType" AS ENUM ('NOTE', 'LINK', 'FILE', 'IMAGE');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Pod" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "kind" "PodKind" NOT NULL,
    "name" TEXT NOT NULL,
    "syllabusVersionId" UUID,
    "subjectId" UUID,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodItem" (
    "id" UUID NOT NULL,
    "podId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "type" "PodItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "noteJson" JSONB,
    "noteText" TEXT,
    "url" TEXT,
    "linkDescription" TEXT,
    "faviconUrl" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER,
    "extractedText" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "PodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodFile" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodItemTopic" (
    "itemId" UUID NOT NULL,
    "topicId" UUID NOT NULL,

    CONSTRAINT "PodItemTopic_pkey" PRIMARY KEY ("itemId","topicId")
);

-- CreateTable
CREATE TABLE "TopicCompletion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "done" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pod_ownerId_deletedAt_idx" ON "Pod"("ownerId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_ownerId_subjectId_key" ON "Pod"("ownerId", "subjectId");

-- CreateIndex
CREATE INDEX "PodItem_podId_deletedAt_createdAt_idx" ON "PodItem"("podId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PodItem_ownerId_deletedAt_idx" ON "PodItem"("ownerId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PodFile_storageKey_key" ON "PodFile"("storageKey");

-- CreateIndex
CREATE INDEX "PodFile_itemId_order_idx" ON "PodFile"("itemId", "order");

-- CreateIndex
CREATE INDEX "PodItemTopic_topicId_idx" ON "PodItemTopic"("topicId");

-- CreateIndex
CREATE INDEX "TopicCompletion_userId_topicId_createdAt_idx" ON "TopicCompletion"("userId", "topicId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodItem" ADD CONSTRAINT "PodItem_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodItem" ADD CONSTRAINT "PodItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodFile" ADD CONSTRAINT "PodFile_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodFile" ADD CONSTRAINT "PodFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodItemTopic" ADD CONSTRAINT "PodItemTopic_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodItemTopic" ADD CONSTRAINT "PodItemTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCompletion" ADD CONSTRAINT "TopicCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- TopicCompletion is a log (rule 6).
CREATE TRIGGER "TopicCompletion_append_only"
  BEFORE UPDATE OR DELETE ON "TopicCompletion"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- Search across pods: titles, notes, links and file text, word by word in any script.
CREATE INDEX "PodItem_search_idx" ON "PodItem" USING GIN (
  to_tsvector('simple',
    coalesce("title", '') || ' ' || coalesce("noteText", '') || ' ' ||
    coalesce("url", '') || ' ' || coalesce("linkDescription", '') || ' ' ||
    coalesce("extractedText", ''))
);
