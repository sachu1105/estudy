-- When people who don't own a paper see their score and its key.
ALTER TABLE "Paper" ADD COLUMN "resultsAt" TIMESTAMPTZ(6);
ALTER TABLE "Paper" ADD COLUMN "keyHidden" BOOLEAN NOT NULL DEFAULT false;
