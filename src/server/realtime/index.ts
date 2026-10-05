import "server-only";

import { Redis } from "ioredis";

import { env } from "@/server/env";
import { redis } from "@/server/redis";

import type { Publisher } from "./types";

export * from "./types";

// Fan-out through Redis pub/sub (CLAUDE.md stack). One subscriber connection per process;
// every SSE stream registers a listener on it instead of opening its own connection.

type Listener = (message: string) => void;

const globalForBus = globalThis as unknown as {
  subscriber?: Redis;
  listeners?: Map<string, Set<Listener>>;
};

function bus() {
  if (!globalForBus.subscriber) {
    const subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const listeners = new Map<string, Set<Listener>>();
    subscriber.on("message", (channel: string, message: string) => {
      for (const listener of listeners.get(channel) ?? []) listener(message);
    });
    globalForBus.subscriber = subscriber;
    globalForBus.listeners = listeners;
  }
  return {
    subscriber: globalForBus.subscriber,
    listeners: globalForBus.listeners!,
  };
}

export const publisher: Publisher = {
  async publish(channel, payload) {
    await redis.publish(channel, JSON.stringify(payload));
  },
};

/** Calls `listener` with each message on `channel`. Returns an unsubscribe function. */
export async function subscribe(channel: string, listener: Listener) {
  const { subscriber, listeners } = bus();
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
    await subscriber.subscribe(channel);
  }
  set.add(listener);
  return async () => {
    set.delete(listener);
    if (set.size === 0 && listeners.get(channel) === set) {
      listeners.delete(channel);
      await subscriber.unsubscribe(channel);
    }
  };
}
