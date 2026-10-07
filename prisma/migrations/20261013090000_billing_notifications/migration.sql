-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('SESSION', 'STREAK', 'WEEKLY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "graceUntil" TIMESTAMPTZ(6),
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "providerId" TEXT,
    "amountPaise" INTEGER,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotifyPrefs" (
    "userId" UUID NOT NULL,
    "sessionReminder" BOOLEAN NOT NULL DEFAULT true,
    "streakAtRisk" BOOLEAN NOT NULL DEFAULT true,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "byEmail" BOOLEAN NOT NULL DEFAULT true,
    "byPush" BOOLEAN NOT NULL DEFAULT true,
    "windowStartMin" INTEGER NOT NULL DEFAULT 1140,
    "quietFromMin" INTEGER NOT NULL DEFAULT 1320,
    "quietToMin" INTEGER NOT NULL DEFAULT 420,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NotifyPrefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "localDate" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_eventId_key" ON "Payment"("eventId");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_userId_kind_localDate_key" ON "ReminderLog"("userId", "kind", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerId_key" ON "Subscription"("providerId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifyPrefs" ADD CONSTRAINT "NotifyPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The payment log is append-only (rule 6): what the provider said is never rewritten.
CREATE TRIGGER "Payment_append_only"
  BEFORE UPDATE OR DELETE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
