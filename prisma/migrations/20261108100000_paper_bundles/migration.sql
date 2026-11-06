-- Question paper bundles given away or sold in squad channels, and who has one.

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "bundleId" UUID;

-- CreateTable
CREATE TABLE "PaperBundle" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "pricePaise" INTEGER,
    "groupId" UUID,
    "channelId" UUID,
    "hiddenAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundlePaper" (
    "bundleId" UUID NOT NULL,
    "paperId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "BundlePaper_pkey" PRIMARY KEY ("bundleId","paperId")
);

-- CreateTable
CREATE TABLE "BundlePurchase" (
    "id" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "provider" "PassProvider",
    "providerRef" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundlePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperBundle_groupId_createdAt_idx" ON "PaperBundle"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "PaperBundle_ownerId_createdAt_idx" ON "PaperBundle"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "BundlePaper_paperId_idx" ON "BundlePaper"("paperId");

-- CreateIndex
CREATE UNIQUE INDEX "BundlePurchase_providerRef_key" ON "BundlePurchase"("providerRef");

-- CreateIndex
CREATE INDEX "BundlePurchase_userId_createdAt_idx" ON "BundlePurchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BundlePurchase_bundleId_createdAt_idx" ON "BundlePurchase"("bundleId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaperBundle" ADD CONSTRAINT "PaperBundle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperBundle" ADD CONSTRAINT "PaperBundle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperBundle" ADD CONSTRAINT "PaperBundle_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePaper" ADD CONSTRAINT "BundlePaper_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "PaperBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePaper" ADD CONSTRAINT "BundlePaper_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePurchase" ADD CONSTRAINT "BundlePurchase_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "PaperBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlePurchase" ADD CONSTRAINT "BundlePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "PaperBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Append-only (rule 6). DELETE stays allowed so a bundle or an account can go.
CREATE TRIGGER "BundlePurchase_append_only"
  BEFORE UPDATE ON "BundlePurchase"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
