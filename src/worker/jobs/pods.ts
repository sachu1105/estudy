import { Worker } from "bullmq";

import {
  POD_QUEUE,
  podJobSchema,
  queueConnection,
  schedulePodMaintenance,
  type PodJob,
} from "@/server/queue";
import { fileService, itemService } from "@/server/services/pods";

/** Pod material in the background: link previews, file text, the daily trash purge. */
export async function startPodWorker() {
  await schedulePodMaintenance();
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
      }
    },
    { connection: queueConnection(), concurrency: 4 },
  );
  worker.on("failed", (job, error) =>
    console.warn(`[worker] pod job ${job?.name} failed: ${error.message}`),
  );
  console.log(`[worker] ${POD_QUEUE}: link previews, file text, trash purge`);
  return worker;
}
