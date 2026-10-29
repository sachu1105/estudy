-- CreateEnum
CREATE TYPE "PassProvider" AS ENUM ('DEMO', 'RAZORPAY');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "accessDays" INTEGER,
ADD COLUMN     "pricePaise" INTEGER;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "accessDays" INTEGER,
ADD COLUMN     "demoUrl" TEXT,
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "pricePaise" INTEGER;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "paidUntil" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "SquadPass" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "channelId" UUID,
    "amountPaise" INTEGER NOT NULL,
    "provider" "PassProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "accessUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadPass_providerRef_key" ON "SquadPass"("providerRef");

-- CreateIndex
CREATE INDEX "SquadPass_userId_groupId_channelId_createdAt_idx" ON "SquadPass"("userId", "groupId", "channelId", "createdAt");

-- CreateIndex
CREATE INDEX "SquadPass_groupId_createdAt_idx" ON "SquadPass"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "SquadPass" ADD CONSTRAINT "SquadPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPass" ADD CONSTRAINT "SquadPass_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPass" ADD CONSTRAINT "SquadPass_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Passes are append-only (rule 6): a renewal is a new row, never an edit. Deletes stay
-- allowed so removing an account (or a squad) still takes its passes with it.
CREATE TRIGGER "SquadPass_append_only"
  BEFORE UPDATE ON "SquadPass"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
