import "server-only";

import { systemClock } from "@/lib/clock";
import { redis } from "@/server/redis";

import { hit, type RateLimitRule } from "./sliding-window";

const MINUTE = 60_000;

// CLAUDE.md rule 13. Keys combine the action with an IP and, where known, an email.
export const rules = {
  loginPerIp: { limit: 30, windowMs: 15 * MINUTE },
  loginPerAccount: { limit: 10, windowMs: 15 * MINUTE },
  registerPerIp: { limit: 5, windowMs: 60 * MINUTE },
  resetPerIp: { limit: 10, windowMs: 60 * MINUTE },
  resetPerAccount: { limit: 3, windowMs: 60 * MINUTE },
  verifyResendPerAccount: { limit: 3, windowMs: 60 * MINUTE },
  refreshPerIp: { limit: 60, windowMs: MINUTE },
  uploadSignPerUser: { limit: 30, windowMs: 60 * MINUTE },
  /** Anything that may start an AI parse: completed uploads, pasted text, retries. */
  parsePerUser: { limit: 10, windowMs: 60 * MINUTE },
  /** Review autosave runs every couple of seconds while editing. */
  syllabusSavePerUser: { limit: 120, windowMs: 5 * MINUTE },
} satisfies Record<string, RateLimitRule>;

export type RuleName = keyof typeof rules;

/** Checks every key; the first one over its limit blocks the attempt. */
export async function rateLimit(checks: [RuleName, string][]) {
  for (const [rule, subject] of checks) {
    const result = await hit(
      redis,
      systemClock,
      `${rule}:${subject}`,
      rules[rule],
    );
    if (!result.ok) return result;
  }
  return { ok: true } as const;
}

export function retryMessage(retryAfterMs: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
