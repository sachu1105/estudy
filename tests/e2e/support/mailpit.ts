import { expect } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

type Summary = { ID: string; Subject: string };

/** Waits for the newest email to `to` with `subject` and returns the token in its link. */
export async function tokenFromEmail(to: string, subject: string) {
  let token: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages } = (await search.json()) as { messages: Summary[] };
        const match = messages.find((m) => m.Subject === subject);
        if (!match) return undefined;
        const message = (await (
          await fetch(`${MAILPIT}/api/v1/message/${match.ID}`)
        ).json()) as {
          Text: string;
        };
        token = message.Text.match(/token=([\w-]+)/)?.[1];
        return token;
      },
      { message: `email "${subject}" to ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();
  return token!;
}

export function uniqueEmail(label: string) {
  return `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}
