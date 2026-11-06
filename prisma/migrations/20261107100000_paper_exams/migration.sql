-- A question paper shared into a squad channel as an exam (PaperShare), and each
-- person's register number and ranked sitting in it (PaperEntry).

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "paperShareId" UUID;

-- CreateTable
CREATE TABLE "PaperShare" (
    "id" UUID NOT NULL,
    "paperId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "sharedById" UUID NOT NULL,
    "opensAt" TIMESTAMPTZ(6) NOT NULL,
    "closesAt" TIMESTAMPTZ(6),
    "resultsAt" TIMESTAMPTZ(6),
    "showNames" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperEntry" (
    "id" UUID NOT NULL,
    "shareId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "registerNo" INTEGER NOT NULL,
    "marks" INTEGER[],
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6),
    "submissionId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperShare_groupId_createdAt_idx" ON "PaperShare"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "PaperShare_paperId_idx" ON "PaperShare"("paperId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperEntry_submissionId_key" ON "PaperEntry"("submissionId");

-- CreateIndex
CREATE INDEX "PaperEntry_userId_idx" ON "PaperEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperEntry_shareId_userId_key" ON "PaperEntry"("shareId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperEntry_shareId_registerNo_key" ON "PaperEntry"("shareId", "registerNo");

-- AddForeignKey
ALTER TABLE "PaperShare" ADD CONSTRAINT "PaperShare_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperShare" ADD CONSTRAINT "PaperShare_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperShare" ADD CONSTRAINT "PaperShare_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperShare" ADD CONSTRAINT "PaperShare_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEntry" ADD CONSTRAINT "PaperEntry_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "PaperShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEntry" ADD CONSTRAINT "PaperEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEntry" ADD CONSTRAINT "PaperEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "OmrSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_paperShareId_fkey" FOREIGN KEY ("paperShareId") REFERENCES "PaperShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

