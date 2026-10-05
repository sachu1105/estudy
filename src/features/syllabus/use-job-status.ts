"use client";

import { useEffect, useState } from "react";

import type { JobEvent } from "@/server/realtime/types";

import { fetchJob } from "./api";

const POLL_MS = 2500;
const terminal = (e: JobEvent) => e.status === "READY" || e.status === "FAILED";

/**
 * Live status of a parse job over SSE. If the stream can't be opened or keeps dropping,
 * falls back to polling the JSON route (CLAUDE.md rule 2: honest status, always).
 */
export function useJobStatus(initial: JobEvent) {
  const [event, setEvent] = useState(initial);

  useEffect(() => {
    if (terminal(initial)) return;
    let stopped = false;
    let poll: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const startPolling = () => {
      const tick = async () => {
        try {
          const next = (await fetchJob(initial.id)) as JobEvent;
          if (stopped) return;
          setEvent(next);
          if (terminal(next)) return;
        } catch {}
        poll = setTimeout(tick, POLL_MS);
      };
      void tick();
    };

    const source =
      typeof EventSource === "undefined"
        ? null
        : new EventSource(`/api/jobs/${initial.id}/stream`);
    if (!source) startPolling();
    source?.addEventListener("job", (message) => {
      failures = 0;
      const next = JSON.parse((message as MessageEvent).data) as JobEvent;
      setEvent(next);
      if (terminal(next)) source.close();
    });
    source?.addEventListener("error", () => {
      failures++;
      // EventSource retries by itself; after a few drops, poll instead.
      if (failures >= 3 && !poll) {
        source.close();
        startPolling();
      }
    });

    return () => {
      stopped = true;
      source?.close();
      clearTimeout(poll);
    };
  }, [initial]);

  return event;
}
