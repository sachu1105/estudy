-- AlterTable
ALTER TABLE "OmrSheet" ADD COLUMN     "timerElapsedSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timerLimitSec" INTEGER,
ADD COLUMN     "timerOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timerRunningSince" TIMESTAMPTZ(6);
