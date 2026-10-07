import "server-only";

import { env } from "@/server/env";

import { createSmtpMailer } from "./mailer";

/** One SMTP transport for the whole app: auth emails and reminders share it. */
export const mailer = createSmtpMailer({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  password: env.SMTP_PASSWORD,
  from: env.EMAIL_FROM,
});
