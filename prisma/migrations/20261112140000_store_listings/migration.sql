-- CreateEnum
CREATE TYPE "StoreListing" AS ENUM ('PENDING', 'LIVE', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'STORE_LISTING';

-- AlterTable
ALTER TABLE "BundlePurchase" ADD COLUMN     "cutPaise" INTEGER;

-- AlterTable
ALTER TABLE "PaperBundle" ADD COLUMN     "listedAt" TIMESTAMPTZ(6),
ADD COLUMN     "listing" "StoreListing",
ADD COLUMN     "listingNote" TEXT;

-- CreateIndex
CREATE INDEX "PaperBundle_listing_listedAt_idx" ON "PaperBundle"("listing", "listedAt");

