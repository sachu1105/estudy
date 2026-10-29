"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { channelPriceSchema } from "@/lib/squads/pay";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { channelService, squadPay } from "@/server/services/groups";

// A squad's channels and categories. Every action: requireUser() (rule 9), zod (rule 11),
// rate limited (rule 13). The service checks that the caller is a squad admin.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function guard<S extends z.ZodType>(input: unknown, schema: S) {
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
  const limited = await rateLimit([["groupPerUser", user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    } as const;
  return { fail: null, user, data: parsed.data as z.infer<S> } as const;
}

function done<T extends object>(
  groupId: string,
  result: ({ ok: true } & T) | { ok: false; message: string },
): Result<T> {
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/groups/${groupId}`, "layout");
  return result;
}

const id = z.uuid();
const name = z.string().trim().min(1, "Give it a name.").max(60);
const topic = z
  .string()
  .trim()
  .max(200)
  .transform((t) => t || null);
const postRule = z.enum(["EVERYONE", "ADMINS"]);
const viewRule = z.enum(["EVERYONE", "ADMINS", "PICKED"]);
const slowModeSec = z.number().int().min(0).max(3600);
const subjectName = z
  .string()
  .trim()
  .max(200)
  .transform((v) => v || null);
const direction = z.enum(["up", "down"]);

export async function createChannelAction(
  input: unknown,
): Promise<Result<{ channelId: string }>> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      name,
      topic,
      categoryId: id.nullable(),
      postRule,
      viewRule,
      slowModeSec,
      subjectName: subjectName.optional(),
      /** The owner's price for it; left out, free. */
      price: channelPriceSchema.optional(),
    }),
  );
  if (g.fail) return g.fail;
  const { groupId, price, ...rest } = g.data;
  if (price && !(await squadPay.canPrice(g.user)))
    return { ok: false, error: "Paid channels aren't open to you." };
  // Every new channel is a chat: it holds messages, doubts, files, tests and polls.
  const made = await channelService.create(g.user, groupId, {
    ...rest,
    type: "CHAT",
  });
  if (made.ok && price) {
    const priced = await squadPay.setChannelPrice(
      g.user,
      groupId,
      made.channelId,
      price,
    );
    if (!priced.ok) return done(groupId, priced);
  }
  return done(groupId, made);
}

export async function updateChannelAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      channelId: id,
      name: name.optional(),
      topic: topic.optional(),
      postRule: postRule.optional(),
      viewRule: viewRule.optional(),
      slowModeSec: slowModeSec.optional(),
      subjectName: subjectName.optional(),
      categoryId: id.nullable().optional(),
      /** The owner's price; null makes it free, left out leaves it as it is. */
      price: channelPriceSchema.optional(),
    }),
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, price, ...rest } = g.data;
  const saved = await channelService.update(g.user, groupId, channelId, rest);
  if (saved.ok && price !== undefined)
    return done(
      groupId,
      await squadPay.setChannelPrice(g.user, groupId, channelId, price),
    );
  return done(groupId, saved);
}

export async function moveChannelAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ groupId: id, channelId: id, direction }),
  );
  if (g.fail) return g.fail;
  const { groupId, channelId } = g.data;
  return done(
    groupId,
    await channelService.move(g.user, groupId, channelId, g.data.direction),
  );
}

export async function deleteChannelAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id, channelId: id }));
  if (g.fail) return g.fail;
  const { groupId, channelId } = g.data;
  return done(groupId, await channelService.remove(g.user, groupId, channelId));
}

export async function createCategoryAction(
  input: unknown,
): Promise<Result<{ categoryId: string }>> {
  const g = await guard(input, z.object({ groupId: id, name }));
  if (g.fail) return g.fail;
  const { groupId } = g.data;
  return done(
    groupId,
    await channelService.createCategory(g.user, groupId, g.data.name),
  );
}

export async function renameCategoryAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id, categoryId: id, name }));
  if (g.fail) return g.fail;
  const { groupId, categoryId } = g.data;
  return done(
    groupId,
    await channelService.renameCategory(
      g.user,
      groupId,
      categoryId,
      g.data.name,
    ),
  );
}

export async function moveCategoryAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ groupId: id, categoryId: id, direction }),
  );
  if (g.fail) return g.fail;
  const { groupId, categoryId } = g.data;
  return done(
    groupId,
    await channelService.moveCategory(
      g.user,
      groupId,
      categoryId,
      g.data.direction,
    ),
  );
}

export async function deleteCategoryAction(input: unknown): Promise<Result> {
  const g = await guard(input, z.object({ groupId: id, categoryId: id }));
  if (g.fail) return g.fail;
  const { groupId, categoryId } = g.data;
  return done(
    groupId,
    await channelService.removeCategory(g.user, groupId, categoryId),
  );
}

/** Replaces who is let into a private channel. */
export async function setChannelAccessAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({ groupId: id, channelId: id, userIds: z.array(id).max(500) }),
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, userIds } = g.data;
  return done(
    groupId,
    await channelService.setAccess(g.user, groupId, channelId, userIds),
  );
}

/** How much of a channel reaches the person asking: all, mentions, or nothing. */
export async function setNotifyAction(input: unknown): Promise<Result> {
  const g = await guard(
    input,
    z.object({
      groupId: id,
      channelId: id,
      level: z.enum(["ALL", "MENTIONS", "MUTE"]),
    }),
  );
  if (g.fail) return g.fail;
  const { groupId, channelId, level } = g.data;
  return done(
    groupId,
    await channelService.setNotify(g.user, groupId, channelId, level),
  );
}

/** One chat channel per subject of the squad's exam, under one category. */
export async function addSubjectChannelsAction(
  input: unknown,
): Promise<Result<{ added: number }>> {
  const g = await guard(input, z.object({ groupId: id }));
  if (g.fail) return g.fail;
  const { groupId } = g.data;
  return done(
    groupId,
    await channelService.addSubjectChannels(g.user, groupId),
  );
}
