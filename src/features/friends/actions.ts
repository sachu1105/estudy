"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DM_MAX, NOTE_MAX } from "@/lib/friends/pair";
import type { MessageView } from "@/lib/squads/chat-types";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { dmService, friendService } from "@/server/services/friends";

// Friends and direct messages. Every action: requireUser() (rule 9), zod (rule 11), rate
// limited (rule 13). The services check who is part of what.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

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
        error: parsed.error.issues[0]?.message ?? "Check it and try again.",
      },
    } as const;
  const limited = await rateLimit([[rule, user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    } as const;
  return { fail: null, user, data: parsed.data as z.infer<S> } as const;
}

function out<T extends object>(
  result: ({ ok: true } & T) | { ok: false; message: string },
): Result<T> {
  return result.ok ? result : { ok: false, error: result.message };
}

const id = z.uuid();
const FRIENDS = "/groups/friends";

export async function sendRequestAction(
  input: unknown,
): Promise<Result<{ name: string; accepted: boolean }>> {
  const g = await guard(
    input,
    z.object({
      handle: z.string().trim().min(1, "Enter a username.").max(40),
      note: z
        .string()
        .max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`)
        .nullable(),
    }),
    "friendPerUser",
  );
  if (g.fail) return g.fail;
  const result = out(await friendService.request(g.user, g.data));
  if (result.ok) revalidatePath(FRIENDS, "layout");
  return result;
}

export async function acceptRequestAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ friendshipId: id }), "friendPerUser");
  if (g.fail) return g.fail;
  const result = out(await friendService.accept(g.user, g.data.friendshipId));
  if (result.ok) revalidatePath(FRIENDS, "layout");
  return result;
}

/** Decline, cancel or unfriend: the row goes either way. */
export async function dropFriendAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ friendshipId: id }), "friendPerUser");
  if (g.fail) return g.fail;
  const result = out(await friendService.drop(g.user, g.data.friendshipId));
  if (result.ok) revalidatePath(FRIENDS, "layout");
  return result;
}

export async function blockPersonAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ userId: id }), "friendPerUser");
  if (g.fail) return g.fail;
  const result = out(await friendService.block(g.user, g.data.userId));
  if (result.ok) revalidatePath(FRIENDS, "layout");
  return result;
}

export async function unblockPersonAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ userId: id }), "friendPerUser");
  if (g.fail) return g.fail;
  const result = out(await friendService.unblock(g.user, g.data.userId));
  if (result.ok) revalidatePath(FRIENDS, "layout");
  return result;
}

// ---- Direct messages -----------------------------------------------------------------

const body = z.string().max(DM_MAX, "Keep a message under 2,000 characters.");

export async function sendDmAction(
  input: unknown,
): Promise<Result<{ message: MessageView }>> {
  const g = await guard(
    input,
    z.object({ userId: id, body }),
    "messagePerUser",
  );
  if (g.fail) return g.fail;
  return out(await dmService.send(g.user, g.data.userId, g.data.body));
}

export async function editDmAction(
  input: unknown,
): Promise<Result<{ message: MessageView }>> {
  const g = await guard(
    input,
    z.object({ messageId: id, body }),
    "messagePerUser",
  );
  if (g.fail) return g.fail;
  return out(await dmService.edit(g.user, g.data.messageId, g.data.body));
}

export async function deleteDmAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ messageId: id }), "messagePerUser");
  if (g.fail) return g.fail;
  return out(await dmService.remove(g.user, g.data.messageId));
}

/** Not rate limited beyond the login: it only moves the person's own read marker. */
export async function markDmReadAction(input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = z.object({ userId: id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "No such chat." };
  await dmService.markRead(user, parsed.data.userId);
  return { ok: true };
}
