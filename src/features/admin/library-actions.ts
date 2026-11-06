"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { rateLimit, retryMessage } from "@/server/ratelimit";
import { requireAdmin } from "@/server/services/admin";
import { bundleService } from "@/server/services/omr";

// Admin > Papers: the app's own library. The admin area first (rule 9), zod on input
// (rule 11), rate limited (rule 13); the service writes the audit log.

type Done = { ok: true; id?: string } | { ok: false; error: string };

const librarySchema = z.object({
  id: z.uuid().nullable(),
  title: z.string().trim().min(3, "Give it a name.").max(120),
  description: z
    .string()
    .trim()
    .max(1000, "Keep the description under 1,000 characters."),
  paperIds: z.array(z.uuid()).min(1, "Pick at least one paper.").max(50),
  rupees: z.number().int("Use whole rupees.").nullable(),
  includedIn: z.array(z.enum(["PRO", "ELITE"])).max(2),
});

async function limited(userId: string) {
  const result = await rateLimit([["groupPerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

function refresh() {
  revalidatePath("/admin/papers");
  revalidatePath("/tests");
}

/** A library bundle, new (a draft) or edited. A single paper is a bundle of one. */
export async function saveLibraryAction(input: unknown): Promise<Done> {
  const admin = await requireAdmin("papers");
  const parsed = librarySchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  const blocked = await limited(admin.id);
  if (blocked) return blocked;
  const { id, ...fields } = parsed.data;
  const result = await bundleService.adminSave(admin, id, fields);
  if (!result.ok) return { ok: false, error: result.message };
  refresh();
  return { ok: true, id: result.id };
}

/** Publish to everyone, back to a draft, or take it down (those who have it keep it). */
export async function setLibraryAction(input: unknown): Promise<Done> {
  const admin = await requireAdmin("papers");
  const parsed = z
    .object({ id: z.uuid(), op: z.enum(["publish", "unpublish", "remove"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Refresh and try again." };
  const blocked = await limited(admin.id);
  if (blocked) return blocked;
  const result = await bundleService.adminSet(
    admin,
    parsed.data.id,
    parsed.data.op,
  );
  if (!result.ok) return { ok: false, error: result.message };
  refresh();
  return { ok: true };
}
