import "server-only";

import { randomBytes } from "node:crypto";

import { systemClock } from "@/lib/clock";
import { userEvents } from "@/server/realtime/user-events";
import { dmRepository } from "@/server/repositories/dm-repository";
import { friendRepository } from "@/server/repositories/friend-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { notificationService } from "@/server/services/notifications";

import { createDmService } from "./dm-service";
import { createFriendService } from "./friend-service";

export const friendService = createFriendService({
  friends: friendRepository,
  dms: dmRepository,
  users: userRepository,
  notify: (rows) => notificationService.notify(rows),
  events: userEvents,
  clock: systemClock,
  suffix: () => randomBytes(3).toString("hex"),
});

export const dmService = createDmService({
  dms: dmRepository,
  friends: friendRepository,
  events: userEvents,
  clock: systemClock,
});
