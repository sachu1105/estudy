"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { storeListingService } from "@/server/services/omr";

// Selling in the Store: list your papers, ask a bundle in, or withdraw it. requireUser()
// first (rule 9), zod on input (rule 11), rate limited (rule 13).

type Done = { ok: true; id?: string } | { ok: false; error: string };

const sellSchema = z.object({
  title: z.string().trim().min(3, "Give it a name.").max(120),
  description: z
    .string()
    .trim()
    .max(1000, "Keep the description under 1,000 characters."),
  paperIds: z.array(z.uuid()).min(1, "Pick at least one paper.").max(50),
  rupees: z.number().int("Use whole rupees.").nullable(),
  /** The seller says the paper and key are theirs to share. */
  rights: z.literal(true, "Confirm the papers and keys are yours to share."),
});

async function start(input: unknown) {
  const user = await requireUser();
  const limited = await rateLimit([["groupPerUser", user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    };
  return { fail: null, user, input };
}

function refresh(id: string) {
  revalidatePath(`/bundles/${id}`);
  revalidatePath("/tests");
  revalidatePath("/store");
}

/** A new listing from the seller's own papers; it waits for an admin. */
export async function sellAction(input: unknown): Promise<Done> {
  const s = await start(input);
  if (s.fail) return s.fail;
  const parsed = sellSchema.safeParse(s.input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  const { title, description, paperIds, rupees } = parsed.data;
  const result = await storeListingService.sell(s.user, {
    title,
    description,
    paperIds,
    rupees,
  });
  if (!result.ok) return { ok: false, error: result.message };
  refresh(result.id);
  return { ok: true, id: result.id };
}

const one = z.object({ id: z.uuid() });

/** Ask a bundle you made (say, in a squad) into the Store, or take it out. */
export async function listingAction(input: unknown): Promise<Done> {
  const s = await start(input);
  if (s.fail) return s.fail;
  const parsed = one
    .extend({ op: z.enum(["list", "withdraw"]) })
    .safeParse(s.input);
  if (!parsed.success) return { ok: false, error: "Refresh and try again." };
  const { id, op } = parsed.data;
  const result =
    op === "list"
      ? await storeListingService.list(s.user, id)
      : await storeListingService.withdraw(s.user, id);
  if (!result.ok) return { ok: false, error: result.message };
  refresh(id);
  return { ok: true };
}
