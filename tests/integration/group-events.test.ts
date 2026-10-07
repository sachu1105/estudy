import { afterAll, describe, expect, it } from "vitest";

import { subscribe } from "@/server/realtime";
import { eventsSince, groupEvents } from "@/server/realtime/group-events";
import { groupChannel } from "@/server/realtime/types";
import { redis } from "@/server/redis";

afterAll(() => {
  redis.disconnect();
});

describe("group events", () => {
  it("publishes live and replays what a reconnect missed", async () => {
    const groupId = crypto.randomUUID();
    const heard: { id: string; postId: string }[] = [];
    const stop = await subscribe(groupChannel(groupId), (m) =>
      heard.push(JSON.parse(m)),
    );
    const postId = crypto.randomUUID();
    await groupEvents.emit(groupId, { type: "post", postId });
    await groupEvents.emit(groupId, { type: "reply", postId });
    await expect.poll(() => heard.length).toBe(2);
    await stop();

    const missed = await eventsSince(groupId, heard[0].id);
    expect(missed.gap).toBe(false);
    expect(missed.events.map((e) => e.type)).toEqual(["reply"]);
    expect(missed.events[0].id).toBe(heard[1].id);
  });
});
