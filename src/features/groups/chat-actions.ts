"use server";

import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { chatService } from "@/server/services/groups";
import type { MessageView } from "@/lib/squads/chat-types";

// Squad chat (S3). Every action: requireUser() (rule 9), zod (rule 11), rate limited
// (rule 13). The service checks membership, the channel and who may post there.

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
        error:
          parsed.error.issues[0]?.message ?? "Check the message and try again.",
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
const where = { groupId: id, channelId: id };
const body = z.string().max(2000, "Keep a message under 2,000 characters.");
const mentionIds = z.array(id).max(20);

export async function sendMessageAction(
  input: unknown,
): Promise<Result<{ message: MessageView }>> {
  const g = await guard(
    input,
    z.object({
      ...where,
      body,
      replyToId: id.nullable(),
      mentionIds,
      podItemId: id.nullable(),
    }),
    "messagePerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, ...rest } = g.data;
  return out(await chatService.send(g.user, groupId, channelId, rest));
}

export async function editMessageAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ ...where, messageId: id, body, mentionIds }),
    "messagePerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, messageId, ...rest } = g.data;
  return out(
    await chatService.edit(g.user, groupId, channelId, messageId, rest),
  );
}

export async function deleteMessageAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ ...where, messageId: id }),
    "reactPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, messageId } = g.data;
  return out(await chatService.remove(g.user, groupId, channelId, messageId));
}

export async function reactMessageAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      ...where,
      messageId: id,
      kind: z.enum(["LIKE", "HELPFUL", "THANKS"]),
      on: z.boolean(),
    }),
    "reactPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, messageId, kind, on } = g.data;
  return out(
    await chatService.react(g.user, groupId, channelId, messageId, kind, on),
  );
}

/** The person has seen the channel; no rate limit beyond the session, it only moves forward. */
export async function markReadAction(input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = z.object(where).safeParse(input);
  if (!parsed.success) return { ok: false, error: "No such channel." };
  await chatService.markRead(user, parsed.data.groupId, parsed.data.channelId);
  return { ok: true };
}
