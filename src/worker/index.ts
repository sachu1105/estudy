// Background worker entrypoint, run as its own process with `pnpm worker`.
import "dotenv/config";

import { env } from "@/server/env";
import { aiOn } from "@/server/settings";

import { startParseWorker } from "./jobs/parse-syllabus";
import { startPodWorker } from "./jobs/pods";

async function main() {
  // The switch is read again for every job; this line only says how it starts.
  const ai = (await aiOn().catch(() => false)) ? "on" : "off";
  console.log(`[worker] started (${env.NODE_ENV}, ai=${ai}).`);
  workers.push(startParseWorker(), await startPodWorker());
}

const workers: { close(): Promise<void> }[] = [];
void main();

async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received, finishing current jobs.`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
