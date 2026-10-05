import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import { subscribe } from "@/server/realtime";
import { isTerminal, jobChannel, type JobEvent } from "@/server/realtime/types";
import { jobService } from "@/server/services/syllabus";

const HEARTBEAT_MS = 15_000;
/** Streams end after this; EventSource reconnects and gets a fresh snapshot. */
const MAX_STREAM_MS = 5 * 60_000;

// Server-Sent Events for one parse job: the current state first, then every change
// published by the worker, until the job is ready or failed.
export const GET = withUser<RouteContext<"/api/jobs/[id]/stream">>(
  async (request, user, context) => {
    const { id } = await context.params;
    const job = isId(id) ? await jobService.findForUser(id, user.id) : null;
    if (!job)
      return NextResponse.json({ error: "No such job." }, { status: 404 });

    const encoder = new TextEncoder();
    let cleanup = async () => {};
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (chunk: string) => {
          if (!closed) controller.enqueue(encoder.encode(chunk));
        };
        const close = async () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearTimeout(limit);
          await unsubscribe();
          controller.close();
        };
        const emit = (event: JobEvent) => {
          send(`event: job\ndata: ${JSON.stringify(event)}\n\n`);
          if (isTerminal(event)) void close();
        };

        const unsubscribe = await subscribe(jobChannel(id), (message) => {
          emit(JSON.parse(message) as JobEvent);
        });
        const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
        const limit = setTimeout(() => void close(), MAX_STREAM_MS);
        cleanup = close;
        request.signal.addEventListener("abort", () => void close());

        // Re-read after subscribing so no update between the two is lost.
        const fresh = await jobService.findForUser(id, user.id);
        send("retry: 3000\n\n");
        if (fresh)
          emit({
            id: fresh.id,
            status: fresh.status,
            stage: fresh.stage,
            progress: fresh.progress,
            error: fresh.error,
            reused: fresh.reused,
          });
      },
      cancel() {
        return cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  },
);
