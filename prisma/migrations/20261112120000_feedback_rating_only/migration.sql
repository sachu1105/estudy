-- Feedback is a rating and a note now: ideas, votes and problem reports are gone.

-- DropForeignKey
ALTER TABLE "IdeaVote" DROP CONSTRAINT "IdeaVote_ideaId_fkey";
ALTER TABLE "IdeaVote" DROP CONSTRAINT "IdeaVote_userId_fkey";
ALTER TABLE "Idea" DROP CONSTRAINT "Idea_authorId_fkey";
ALTER TABLE "ProblemReport" DROP CONSTRAINT "ProblemReport_userId_fkey";

-- DropTable
DROP TABLE "IdeaVote";
DROP TABLE "Idea";
DROP TABLE "ProblemReport";

-- DropEnum
DROP TYPE "IdeaArea";
DROP TYPE "IdeaStatus";
DROP TYPE "ProblemCategory";
DROP TYPE "ProblemStatus";

-- The team's answers to ideas and problems went out as FEEDBACK notifications. With
-- nothing left to answer, they go, and so does the kind.
DELETE FROM "Notification" WHERE "kind" = 'FEEDBACK';

-- AlterEnum
CREATE TYPE "NotificationKind_new" AS ENUM ('MENTION', 'REPLY', 'ACCEPTED', 'GROUP_TEST', 'REPORT', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'EXAM_DATE');
ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind_new" USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";
