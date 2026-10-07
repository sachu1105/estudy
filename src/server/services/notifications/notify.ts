import "server-only";

import { systemClock } from "@/lib/clock";
import { reminderEmail } from "@/server/email/templates";
import { env } from "@/server/env";
import { mailer } from "@/server/email";
import { sendPush } from "@/server/push";
import { notifyRepository } from "@/server/repositories/notify-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { progressService } from "@/server/services/progress";

import { createNotifyService } from "./notify-service";

export const notifyService = createNotifyService({
  notify: notifyRepository,
  clock: systemClock,
  async streakOf(userId, timezone) {
    const user = await userRepository.findSessionUser(userId);
    if (!user) return 0;
    const streak = await progressService.streak({ ...user, timezone });
    return streak.current;
  },
  sendEmail: (message) => mailer.send(message),
  sendPush,
  emailFor: (message, person) =>
    reminderEmail(
      person.email,
      person.name,
      message,
      `${env.APP_URL}${message.url}`,
      `${env.APP_URL}/settings`,
    ),
});
