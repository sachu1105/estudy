import { Worker } from "bullmq";

import {
  POD_QUEUE,
  podJobSchema,
  queueConnection,
  schedulePodMaintenance,
  type PodJob,
} from "@/server/queue";
import { planService } from "@/server/services/plans";
import { rankService } from "@/server/services/rank";
import { flagOn } from "@/server/settings";
import { fileService, itemService } from "@/server/services/pods";

/** Pod material in the background: link previews, file text, the daily trash purge. */
export async function startPodWorker() {
  await schedulePodMaintenance();
  // Boards are a cache: start from the truth, then keep up with each new XP entry.
  void rankService
    .rebuild()
    .catch((e) => console.warn(`[worker] rank rebuild failed: ${String(e)}`));
  const worker = new Worker<PodJob>(
    POD_QUEUE,
    async (job) => {
      const data = podJobSchema.parse(job.data);
      switch (data.kind) {
        case "link-meta":
          return itemService.fetchLinkPreview(data.itemId);
        case "extract-file":
          return fileService.extractFileText(data.itemId);
        case "purge-trash": {
          const purged = await itemService.purgeTrash();
          if (purged)
            console.log(`[worker] purged ${purged} trashed pod items`);
          return;
        }
        case "rebuild-ranks": {
          const users = await rankService.rebuild();
          console.log(`[worker] ranks rebuilt for ${users} users`);
          return;
        }
        case "replan-week": {
          if (!(await flagOn("weeklyReplan"))) {
            console.log("[worker] weekly re-plan is switched off by an admin");
            return;
          }
          const remade = await planService.replanAll();
          console.log(`[worker] weekly re-plan: ${remade} plans re-made`);
          return;
        }
      }
    },
    { connection: queueConnection(), concurrency: 4 },
  );
  worker.on("failed", (job, error) =>
    console.warn(`[worker] pod job ${job?.name} failed: ${error.message}`),
  );
  console.log(`[worker] ${POD_QUEUE}: link previews, file text, trash purge, weekly re-plan`);
  return worker;
}
