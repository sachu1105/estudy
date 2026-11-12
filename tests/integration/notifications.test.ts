import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { notificationRepository } from "@/server/repositories/notification-repository";
import { createNotificationService } from "@/server/services/notifications/notification-service";

import { resetDatabase } from "./helpers";

const notifications = createNotificationService({
  notifications: notificationRepository,
  clock: fixedClock("2026-11-12T04:30:00Z"),
});

async function user(name: string) {
  const u = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
    },
  });
  return { id: u.id, subscription: null };
}

describe("notification inbox", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("reads one, deletes one, and never touches someone else's", async () => {
    const anu = await user("Anu");
    const binu = await user("Binu");
    const row = {
      actorId: binu.id,
      kind: "FRIEND_REQUEST" as const,
      groupId: null,
      href: "/friends",
      subject: "",
    };
    await notifications.notify([{ ...row, userId: anu.id }]);
    await notifications.notify([{ ...row, userId: anu.id }]);
    await notifications.notify([{ ...row, actorId: anu.id, userId: binu.id }]);

    const [first, second] = await notifications.list(anu);
    expect(await notifications.unread(anu)).toBe(2);

    await notifications.markRead(anu, first!.id);
    expect(await notifications.unread(anu)).toBe(1);

    // Binu can't delete Anu's notification by its id.
    await notifications.remove(binu, second!.id);
    expect(await notifications.list(anu)).toHaveLength(2);

    await notifications.remove(anu, second!.id);
    expect((await notifications.list(anu)).map((n) => n.id)).toEqual([
      first!.id,
    ]);
    expect(await notifications.unread(anu)).toBe(0);
    expect(await notifications.list(binu)).toHaveLength(1);
  });
});
