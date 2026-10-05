// Background worker entrypoint, run as its own process with `pnpm worker`.
// BullMQ queues and jobs are registered here from milestone 4 onward.
import "dotenv/config";

import { env } from "@/server/env";

console.log(
  `[worker] started (${env.NODE_ENV}, ai=${env.AI_PROVIDER}). No jobs registered yet.`,
);

function shutdown(signal: string) {
  console.log(`[worker] ${signal} received, shutting down.`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Keep the process alive until real queues hold it open.
setInterval(() => {}, 1 << 30);
