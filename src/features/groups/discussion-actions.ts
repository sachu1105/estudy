"use server";

import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { discussionService } from "@/server/services/groups";

// Group discussion (milestone 14). Every action: requireUser() (rule 9), zod (rule 11),
// rate limited (rule 13). The service checks membership and group role.

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
          parsed.error.issues[0]?.message ?? "Check the form and try again.",
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
const body = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(5000, "Keep it under 5000 characters.");
const mentionIds = z.array(id).max(20);

export async function createPostAction(
  input: unknown,
): Promise<Result<{ postId: string }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      kind: z.enum(["DISCUSSION", "QUESTION"]),
      title: z
        .string()
        .trim()
        .min(3, "Give it a title of 3 letters or more.")
        .max(140),
      body,
      mentionIds,
      subjectName: z.string().trim().max(200).nullable(),
      topicName: z.string().trim().max(200).nullable(),
    }),
    "postPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, ...rest } = g.data;
  return out(await discussionService.create(g.user, groupId, rest));
}

export async function replyAction(
  input: unknown,
): Promise<Result<{ replyId: string }>> {
  const g = await guard(
    input,
    z.object({ groupId: id, postId: id, body, mentionIds }),
    "postPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, postId, ...rest } = g.data;
  return out(await discussionService.reply(g.user, groupId, postId, rest));
}

export async function reactAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      postId: id,
      replyId: id.nullable(),
      kind: z.enum(["LIKE", "HELPFUL", "THANKS"]),
      on: z.boolean(),
    }),
    "reactPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, ...rest } = g.data;
  return out(await discussionService.react(g.user, groupId, rest));
}

export async function acceptAnswerAction(
  input: unknown,
): Promise<Result<{ xp: number }>> {
  const g = await guard(
    input,
    z.object({ groupId: id, postId: id, replyId: id.nullable() }),
    "reactPerUser",
  );
  if (g.fail) return g.fail;
  const d = g.data;
  return out(
    await discussionService.accept(g.user, d.groupId, d.postId, d.replyId),
  );
}

export async function pinPostAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ groupId: id, postId: id, on: z.boolean() }),
    "groupPerUser",
  );
  if (g.fail) return g.fail;
  const d = g.data;
  return out(await discussionService.pin(g.user, d.groupId, d.postId, d.on));
}

export async function hidePostAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      postId: id,
      replyId: id.nullable(),
      on: z.boolean(),
    }),
    "groupPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, on, ...target } = g.data;
  return out(await discussionService.hide(g.user, groupId, target, on));
}

export async function deletePostAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ groupId: id, postId: id, replyId: id.nullable() }),
    "groupPerUser",
  );
  if (g.fail) return g.fail;
  const { groupId, ...target } = g.data;
  return out(await discussionService.remove(g.user, groupId, target));
}
