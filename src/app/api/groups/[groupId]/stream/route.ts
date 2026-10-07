import { NextResponse } from "next/server";

import { isId } from "@/lib/ids";
import { withUser } from "@/server/auth/route";
import { subscribe } from "@/server/realtime";
import {
  eventsSince,
  isStreamId,
  type StreamedEvent,
} from "@/server/realtime/group-events";
import { groupChannel } from "@/server/realtime/types";
import { groupService } from "@/server/services/groups";

const HEARTBEAT_MS = 25_000;
/** Streams end after this; EventSource reconnects with Last-Event-ID and resumes. */
const MAX_STREAM_MS = 10 * 60_000;

// Server-Sent Events for one group's discussion (milestone 14): new posts, replies,
// reactions and moderation, as ids only. Members only (rule 9). A reconnect sends
// Last-Event-ID and gets what it missed from the group's Redis stream.
export const GET = withUser<RouteContext<"/api/groups/[groupId]/stream">>(
  async (request, user, context) => {
    const { groupId } = await context.params;
    const member = isId(groupId)
      ? await groupService.require(user, groupId, "MEMBER")
      : null;
    if (!member || "error" in member)
      return NextResponse.json({ error: "No such squad." }, { status: 404 });
    const lastId = request.headers.get("last-event-id") ?? "";

    const encoder = new TextEncoder();
    let cleanup = async () => {};
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        let sentUpTo = isStreamId(lastId) ? lastId : "0-0";
        const send = (chunk: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            // The client went away between the check and the write.
            void close();
          }
        };
        const emit = (event: StreamedEvent) => {
          // Live and replayed events can overlap right after subscribing.
          if (!newer(event.id, sentUpTo)) return;
          sentUpTo = event.id;
          const { id, ...data } = event;
          send(`event: group\nid: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        const close = async () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearTimeout(limit);
          await unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed by the runtime when the client disconnected.
          }
        };

        const unsubscribe = await subscribe(groupChannel(groupId), (message) =>
          emit(JSON.parse(message) as StreamedEvent),
        );
        const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
        const limit = setTimeout(() => void close(), MAX_STREAM_MS);
        cleanup = close;
        request.signal.addEventListener("abort", () => void close());

        send("retry: 3000\n\n");
        if (isStreamId(lastId)) {
          const missed = await eventsSince(groupId, lastId).catch(() => ({
            gap: true,
            events: [] as StreamedEvent[],
          }));
          if (missed.gap) send(`event: resync\ndata: {}\n\n`);
          for (const event of missed.events) emit(event);
        }
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

function newer(a: string, b: string) {
  const [am, as] = a.split("-").map(Number);
  const [bm, bs] = b.split("-").map(Number);
  return am > bm || (am === bm && as > bs);
}
