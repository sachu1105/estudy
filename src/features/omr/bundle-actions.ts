"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { bundleService } from "@/server/services/omr";

// Bundles of question papers: add a free one, pay for one, or stop offering yours.
// requireUser() first (rule 9), zod on input (rule 11), rate limited (rule 13).

type Done = { ok: true } | { ok: false; error: string };

async function guard<S extends z.ZodType>(
  input: unknown,
  schema: S,
  rule: RuleName,
) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      fail: {
        ok: false as const,
        error: "That didn't work. Refresh and try again.",
      },
    };
  const limited = await rateLimit([[rule, user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    };
  return { fail: null, user, data: parsed.data as z.infer<S> };
}

const one = z.object({ id: z.uuid() });

function after(
  result: { ok: true } | { ok: false; message: string },
  id: string,
): Done {
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/bundles/${id}`);
  revalidatePath("/tests");
  return { ok: true };
}

/** Whether the bundle form shows a price: the squad's owner, allowed to sell. */
export async function canChargeAction(input: unknown): Promise<boolean> {
  const user = await requireUser();
  const parsed = z
    .object({ groupId: z.uuid(), channelId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return false;
  return bundleService.canCharge(
    user,
    parsed.data.groupId,
    parsed.data.channelId,
  );
}

export async function claimBundleAction(input: unknown): Promise<Done> {
  const g = await guard(input, one, "groupPerUser");
  if (g.fail) return g.fail;
  return after(await bundleService.claim(g.user, g.data.id), g.data.id);
}

/** Pay for a bundle. No revalidation: that would swap the receipt out from under the
 *  buyer; the receipt's own button refreshes the page. */
export async function buyBundleAction(input: unknown): Promise<Done> {
  const g = await guard(input, one, "payPerUser");
  if (g.fail) return g.fail;
  const result = await bundleService.buy(g.user, g.data.id);
  return result.ok ? { ok: true } : { ok: false, error: result.message };
}

export async function stopBundleAction(input: unknown): Promise<Done> {
  const g = await guard(input, one, "groupPerUser");
  if (g.fail) return g.fail;
  return after(await bundleService.stop(g.user, g.data.id), g.data.id);
}
