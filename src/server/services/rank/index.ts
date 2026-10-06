import "server-only";

import { systemClock } from "@/lib/clock";
import { rankStore } from "@/server/rank/rank-store";
import { rankRepository } from "@/server/repositories/rank-repository";

import { createRankService } from "./rank-service";

export { ABUSE_LIMITS, TOP } from "./rank-service";

export const rankService = createRankService({
  ranks: rankRepository,
  store: rankStore,
  clock: systemClock,
});
