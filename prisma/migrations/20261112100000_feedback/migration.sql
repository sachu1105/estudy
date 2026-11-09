-- CreateEnum
CREATE TYPE "IdeaArea" AS ENUM ('PODS', 'PLAN', 'TESTS', 'SQUADS', 'STORE', 'OTHER');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('REVIEW', 'OPEN', 'PLANNED', 'BUILDING', 'SHIPPED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ProblemCategory" AS ENUM ('BUG', 'CONFUSING', 'CONTENT', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('RECEIVED', 'LOOKING', 'FIXED', 'CLOSED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'FEEDBACK';

-- CreateTable
CREATE TABLE "AppRating" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stars" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "area" "IdeaArea" NOT NULL DEFAULT 'OTHER',
    "status" "IdeaStatus" NOT NULL DEFAULT 'REVIEW',
    "fromTeam" BOOLEAN NOT NULL DEFAULT false,
    "credit" BOOLEAN NOT NULL DEFAULT true,
    "teamNote" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaVote" (
    "ideaId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaVote_pkey" PRIMARY KEY ("ideaId","userId")
);

-- CreateTable
CREATE TABLE "ProblemReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "ProblemCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "page" TEXT,
    "device" TEXT,
    "status" "ProblemStatus" NOT NULL DEFAULT 'RECEIVED',
    "credit" BOOLEAN NOT NULL DEFAULT true,
    "teamNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProblemReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRating_userId_key" ON "AppRating"("userId");

-- CreateIndex
CREATE INDEX "AppRating_updatedAt_idx" ON "AppRating"("updatedAt");

-- CreateIndex
CREATE INDEX "Idea_status_votes_idx" ON "Idea"("status", "votes");

-- CreateIndex
CREATE INDEX "Idea_authorId_idx" ON "Idea"("authorId");

-- CreateIndex
CREATE INDEX "IdeaVote_userId_idx" ON "IdeaVote"("userId");

-- CreateIndex
CREATE INDEX "ProblemReport_status_createdAt_idx" ON "ProblemReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemReport_userId_createdAt_idx" ON "ProblemReport"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AppRating" ADD CONSTRAINT "AppRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemReport" ADD CONSTRAINT "ProblemReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A rating is 1 to 5 stars, whatever reaches the database.
ALTER TABLE "AppRating" ADD CONSTRAINT "AppRating_stars_range" CHECK ("stars" BETWEEN 1 AND 5);
