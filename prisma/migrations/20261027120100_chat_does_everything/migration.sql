-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'DOUBT', 'POLL');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "acceptedAnswerId" UUID,
ADD COLUMN     "groupTestId" UUID,
ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "PollOption" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PollOption_messageId_order_idx" ON "PollOption"("messageId", "order");

-- CreateIndex
CREATE INDEX "PollVote_optionId_idx" ON "PollVote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_messageId_userId_key" ON "PollVote"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_groupTestId_fkey" FOREIGN KEY ("groupTestId") REFERENCES "GroupTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_acceptedAnswerId_fkey" FOREIGN KEY ("acceptedAnswerId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
