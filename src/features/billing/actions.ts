"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { billingService } from "@/server/services/billing";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Starts a checkout. Nothing is granted here: only the provider's webhook does that. */
export async function startCheckoutAction(
  input: unknown,
): Promise<
  Result<{ subscriptionId: string; keyId: string; amountPaise: number }>
> {
  const user = await requireUser();
  const parsed = z.object({ plan: z.enum(["PRO", "ELITE"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a plan to continue." };
  const limited = await rateLimit([["billingPerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await billingService.startCheckout(user, parsed.data.plan);
  return result.ok ? result : { ok: false, error: result.message };
}

/** Stops at the end of the period already paid for; nothing of theirs is removed. */
export async function cancelSubscriptionAction(): Promise<Result> {
  const user = await requireUser();
  const limited = await rateLimit([["billingPerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await billingService.cancel(user);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/settings/plan");
  return { ok: true };
}
