-- The app's own library of papers and bundles (Admin > Papers): free, priced, or
-- included in plans.

-- AlterTable
ALTER TABLE "PaperBundle" ADD COLUMN     "catalogue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includedIn" "Plan"[],
ADD COLUMN     "publishedAt" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "PaperBundle_catalogue_publishedAt_idx" ON "PaperBundle"("catalogue", "publishedAt");

