import "server-only";

import { redis } from "@/server/redis";

import { publisher } from "./index";
import { groupChannel, type GroupEvent, type GroupEvents } from "./types";

// Each group's events go to a capped Redis stream as well as pub/sub. The stream id is
// the SSE event id, so a reconnect with Last-Event-ID replays what it missed.

const PREFIX = process.env.VITEST ? "test:" : "";
const streamKey = (groupId: string) => `${PREFIX}groupstream:${groupId}`;
/** Enough for a phone that slept a while; older gaps are covered by a refresh. */
const KEEP = 500;
const TTL_SECONDS = 24 * 3600;

export type StreamedEvent = GroupEvent & { id: string };

export const groupEvents: GroupEvents = {
  async emit(groupId, event) {
    try {
      const key = streamKey(groupId);
      const id = await redis.xadd(
        key,
        "MAXLEN",
        "~",
        String(KEEP),
        "*",
        "e",
        JSON.stringify(event),
      );
      await redis.expire(key, TTL_SECONDS);
      await publisher.publish(groupChannel(groupId), { ...event, id });
    } catch {
      // Realtime is a nicety: the post is saved, and the next load shows it.
    }
  },
};

/**
 * Events after `lastId`, oldest first. `gap` is true when the oldest event still kept is
 * newer than `lastId`: some may have been trimmed, so the client should re-read.
 * (Every emit renews the stream's expiry, so an expired stream means nothing happened.)
 */
export async function eventsSince(groupId: string, lastId: string) {
  const key = streamKey(groupId);
  const [rows, oldest] = await Promise.all([
    redis.xrange(key, `(${lastId}`, "+", "COUNT", KEEP),
    redis.xrange(key, "-", "+", "COUNT", 1),
  ]);
  return {
    gap: !!oldest[0] && compareIds(oldest[0][0], lastId) > 0,
    events: rows.map(([id, fields]) => ({
      ...(JSON.parse(fields[1]) as GroupEvent),
      id,
    })),
  };
}

function compareIds(a: string, b: string) {
  const [am, as] = a.split("-").map(Number);
  const [bm, bs] = b.split("-").map(Number);
  return am - bm || as - bs;
}

export const isStreamId = (id: string) => /^\d{1,16}-\d{1,8}$/.test(id);
