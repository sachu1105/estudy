-- The global rank was removed: its privacy switch and district filter go with it.
ALTER TABLE "User" DROP COLUMN "hideFromGlobalRank",
DROP COLUMN "district";
