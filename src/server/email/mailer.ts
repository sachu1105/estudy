import { createTransport } from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
};

export function createSmtpMailer(config: SmtpConfig): Mailer {
  const transport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user
      ? { user: config.user, pass: config.password }
      : undefined,
  });
  return {
    async send(message) {
      await transport.sendMail({ from: config.from, ...message });
    },
  };
}

/** Collects messages in memory. For tests. */
export function createMemoryMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}
