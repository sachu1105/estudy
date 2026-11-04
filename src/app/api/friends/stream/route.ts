import { withUser } from "@/server/auth/route";
import { subscribe } from "@/server/realtime";
import { userChannel } from "@/server/realtime/types";

const HEARTBEAT_MS = 25_000;
/** Streams end after this; EventSource reconnects and the client re-reads. */
const MAX_STREAM_MS = 10 * 60_000;

// Server-Sent Events for the signed-in person only: direct messages to and from them and
// changes to their friends, as ids. Nothing is replayed: every (re)open is a cue to
// re-read, which the client does on "open".
export const GET = withUser(async (request, user) => {
  const encoder = new TextEncoder();
  let cleanup = async () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          void close();
        }
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
      const unsubscribe = await subscribe(userChannel(user.id), (message) =>
        send(`event: user\ndata: ${message}\n\n`),
      );
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      const limit = setTimeout(() => void close(), MAX_STREAM_MS);
      cleanup = close;
      request.signal.addEventListener("abort", () => void close());
      send("retry: 3000\n\n");
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
});
