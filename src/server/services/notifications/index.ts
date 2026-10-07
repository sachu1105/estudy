import "server-only";

import { systemClock } from "@/lib/clock";
import { notificationRepository } from "@/server/repositories/notification-repository";

import { createNotificationService } from "./notification-service";

export const notificationService = createNotificationService({
  notifications: notificationRepository,
  clock: systemClock,
});
