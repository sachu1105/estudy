"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TEMPLATE_KEYS } from "@/lib/squads/templates";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import {
  groupService,
  groupTests,
  materialService,
} from "@/server/services/groups";

// Every action: requireUser() (rule 9), zod (rule 11), rate limited (rule 13). The
// service checks membership and group role on every call.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const invalid = { ok: false as const, error: "Check the form and try again." };

async function guard(input: unknown, schema: z.ZodType) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      fail: {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? invalid.error,
      },
    };
  const limited = await rateLimit([["groupPerUser", user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    };
  return { fail: null, user, data: parsed.data };
}

function done<T extends object>(
  result: ({ ok: true } & T) | { ok: false; message: string },
  ...paths: string[]
): Result<T> {
  if (!result.ok) return { ok: false, error: result.message };
  for (const p of paths) revalidatePath(p, "layout");
  return result;
}

const id = z.uuid();

export async function createGroupAction(
  input: unknown,
): Promise<Result<{ groupId: string }>> {
  const g = await guard(
    input,
    z.object({
      name: z
        .string()
        .trim()
        .min(3, "Give the squad a name of 3 letters or more.")
        .max(80),
      description: z
        .string()
        .trim()
        .max(500)
        .transform((d) => d || null),
      examId: id.nullable(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]),
      joinMode: z.enum(["OPEN", "REQUEST", "INVITE_ONLY"]).optional(),
      joinQuestion: z
        .string()
        .trim()
        .max(200)
        .transform((q) => q || null)
        .optional(),
      template: z.enum(TEMPLATE_KEYS).default("EXAM"),
    }),
  );
  if (g.fail) return g.fail;
  return done(await groupService.create(g.user, g.data as never), "/groups");
}

export async function joinGroupAction(
  input: unknown,
): Promise<Result<{ joined: boolean }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      answer: z
        .string()
        .trim()
        .max(300)
        .transform((a) => a || null)
        .optional(),
    }),
  );
  if (g.fail) return g.fail;
  const { groupId, answer } = g.data as {
    groupId: string;
    answer?: string | null;
  };
  return done(
    await groupService.join(g.user, groupId, answer ?? null),
    "/groups",
  );
}

export async function joinByCodeAction(
  input: unknown,
): Promise<Result<{ groupId: string }>> {
  const g = await guard(
    input,
    z.object({ code: z.string().trim().min(6).max(12) }),
  );
  if (g.fail) return g.fail;
  return done(
    await groupService.joinByCode(g.user, (g.data as { code: string }).code),
    "/groups",
  );
}

export async function leaveGroupAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id }));
  if (g.fail) return g.fail;
  return done(
    await groupService.leave(g.user, (g.data as { groupId: string }).groupId),
    "/groups",
  );
}

export async function deleteGroupAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id }));
  if (g.fail) return g.fail;
  return done(
    await groupService.remove(g.user, (g.data as { groupId: string }).groupId),
    "/groups",
  );
}

export async function manageMemberAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      userId: id,
      action: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("remove") }),
        z.object({
          kind: z.literal("mute"),
          hours: z
            .number()
            .int()
            .min(1)
            .max(24 * 30)
            .nullable(),
        }),
        z.object({
          kind: z.literal("role"),
          role: z.enum(["ADMIN", "MEMBER"]),
        }),
      ]),
    }),
  );
  if (g.fail) return g.fail;
  const d = g.data as {
    groupId: string;
    userId: string;
    action: Parameters<typeof groupService.manage>[3];
  };
  return done(
    await groupService.manage(g.user, d.groupId, d.userId, d.action),
    `/groups/${d.groupId}`,
  );
}

export async function decideRequestAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ requestId: id, approve: z.boolean() }),
  );
  if (g.fail) return g.fail;
  const d = g.data as { requestId: string; approve: boolean };
  return done(
    await groupService.decideRequest(g.user, d.requestId, d.approve),
    "/groups",
  );
}

export async function createInviteAction(
  input: unknown,
): Promise<Result<{ code: string }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      days: z.number().int().min(1).max(365).nullable(),
      maxUses: z.number().int().min(1).max(1000).nullable(),
    }),
  );
  if (g.fail) return g.fail;
  const d = g.data as {
    groupId: string;
    days: number | null;
    maxUses: number | null;
  };
  return done(
    await groupService.createInvite(g.user, d.groupId, d),
    `/groups/${d.groupId}`,
  );
}

export async function revokeInviteAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id, inviteId: id }));
  if (g.fail) return g.fail;
  const d = g.data as { groupId: string; inviteId: string };
  return done(
    await groupService.revokeInvite(g.user, d.groupId, d.inviteId),
    `/groups/${d.groupId}`,
  );
}

export async function blockUserAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ userId: id, on: z.boolean() }));
  if (g.fail) return g.fail;
  const d = g.data as { userId: string; on: boolean };
  return done(await groupService.block(g.user, d.userId, d.on), "/groups");
}

/** Reports go to the site admins' queue (every piece of user content, milestone 13). */
export async function reportAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      type: z.enum([
        "GROUP",
        "GROUP_ITEM",
        "GROUP_TEST",
        "USER",
        "POST",
        "REPLY",
      ]),
      targetId: id,
      groupId: id.nullable(),
      reason: z.enum(["spam", "abuse", "copyright", "wrong", "other"]),
      note: z.string().trim().max(500).nullable(),
    }),
  );
  if (g.fail) return g.fail;
  const d = g.data as {
    type: "GROUP";
    targetId: string;
    groupId: string | null;
    reason: string;
    note: string | null;
  };
  await groupService.report(
    g.user,
    { type: d.type, id: d.targetId, groupId: d.groupId },
    d.reason,
    d.note || null,
  );
  return { ok: true };
}

// ---- Shared material (milestone 13) ------------------------------------------------

export async function shareFromPodAction(
  input: unknown,
): Promise<Result<{ itemId: string }>> {
  const g = await guard(input, z.object({ groupId: id, podItemId: id }));
  if (g.fail) return g.fail;
  const d = g.data as { groupId: string; podItemId: string };
  return done(
    await materialService.shareFromPod(g.user!, d.groupId, d.podItemId),
    `/groups/${d.groupId}`,
  );
}

export async function addGroupLinkAction(
  input: unknown,
): Promise<Result<{ itemId: string }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      url: z.string().trim().min(4).max(2000),
      title: z
        .string()
        .trim()
        .max(200)
        .transform((t) => t || null),
      topicName: z
        .string()
        .trim()
        .max(200)
        .transform((t) => t || null),
    }),
  );
  if (g.fail) return g.fail;
  const d = g.data as {
    groupId: string;
    url: string;
    title: string | null;
    topicName: string | null;
  };
  return done(
    await materialService.addLink(g.user!, d.groupId, {
      ...d,
      subjectName: null,
    }),
    `/groups/${d.groupId}`,
  );
}

export async function removeGroupItemAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id, itemId: id }));
  if (g.fail) return g.fail;
  const d = g.data as { groupId: string; itemId: string };
  return done(
    await materialService.remove(g.user!, d.groupId, d.itemId),
    `/groups/${d.groupId}`,
  );
}

// ---- Shared tests (milestone 13) ---------------------------------------------------

export async function shareGroupTestAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const g = await guard(input, z.object({ groupId: id, mockTestId: id }));
  if (g.fail) return g.fail;
  const d = g.data as { groupId: string; mockTestId: string };
  return done(
    await groupTests.share(g.user!, d.groupId, d.mockTestId),
    `/groups/${d.groupId}`,
  );
}

export async function buildGroupTestAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      title: z.string().trim().min(3, "Give the test a name.").max(120),
      topics: z
        .array(z.string().trim().min(1).max(200))
        .min(1, "Pick at least one topic.")
        .max(30),
      count: z.number().int().min(5).max(50),
      minutes: z.number().int().min(5).max(180).nullable(),
    }),
  );
  if (g.fail) return g.fail;
  const d = g.data as {
    groupId: string;
    title: string;
    topics: string[];
    count: number;
    minutes: number | null;
  };
  return done(
    await groupTests.build(g.user!, d.groupId, d),
    `/groups/${d.groupId}`,
  );
}

export async function takeGroupTestAction(
  input: unknown,
): Promise<Result<{ testId: string }>> {
  const g = await guard(input, z.object({ groupId: id, groupTestId: id }));
  if (g.fail) return g.fail;
  const d = g.data as { groupId: string; groupTestId: string };
  return done(await groupTests.take(g.user!, d.groupId, d.groupTestId));
}
