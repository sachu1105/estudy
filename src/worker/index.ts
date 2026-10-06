// Background worker entrypoint, run as its own process with `pnpm worker`.
import "dotenv/config";

import { env } from "@/server/env";

import { startParseWorker } from "./jobs/parse-syllabus";
import { startPodWorker } from "./jobs/pods";

console.log(`[worker] started (${env.NODE_ENV}, ai=${env.AI_PROVIDER}).`);

async function main() {
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
