-- CreateTable
CREATE TABLE "OmrSheet" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER,
    "marks" INTEGER[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "OmrSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OmrSheet_storageKey_key" ON "OmrSheet"("storageKey");

-- CreateIndex
CREATE INDEX "OmrSheet_ownerId_createdAt_idx" ON "OmrSheet"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "OmrSheet" ADD CONSTRAINT "OmrSheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
