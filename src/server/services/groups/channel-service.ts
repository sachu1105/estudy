import type { Clock } from "@/lib/clock";
import { channelName } from "@/lib/squads/channel-name";
import type { ChannelPostRule, ChannelType } from "@/lib/squads/templates";
import type { ChannelRepository } from "@/server/repositories/channel-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { GroupService } from "./group-service";

type User = Actor;
type Role = "OWNER" | "ADMIN" | "MEMBER";
type Direction = "up" | "down";

export type ChannelDeps = {
  groups: GroupService;
  channels: ChannelRepository;
  clock: Clock;
  /** The squad owner's plan sets how many channels a squad holds. */
  ownerLimit: (ownerId: string, feature: "channelsPerSquad") => Promise<number>;
};

const isAdmin = (role: Role) => role === "OWNER" || role === "ADMIN";
const GONE = failure("NOT_FOUND", "That channel is gone.");
const BAD_NAME = failure(
  "BAD_NAME",
  "Give the channel a name with at least one letter or number.",
);

/** A squad's channels and categories: who sees them, who posts, who arranges them. */
export function createChannelService(deps: ChannelDeps) {
  const admin = (user: User, groupId: string) =>
    deps.groups.require(user, groupId, "ADMIN");

  return {
    /** Categories in order with their channels; uncategorised channels come first. */
    async layout(user: User, groupId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const [categories, channels] = await Promise.all([
        deps.channels.categories(groupId),
        deps.channels.channels(groupId),
      ]);
      const inCategory = (id: string | null) =>
        channels.filter((c) => c.categoryId === id);
      return {
        role: ok.me.role,
        canManage: isAdmin(ok.me.role),
        loose: inCategory(null),
        categories: categories.map((c) => ({
          ...c,
          channels: inCategory(c.id),
        })),
      };
    },

    /** A public squad's channel names, so people can see what's inside before joining. */
    async preview(user: User, groupId: string) {
      const found = await deps.groups.memberOf(user, groupId);
      if (!found || found.group.hiddenAt) return [];
      if (!found.membership && found.group.visibility === "PRIVATE") return [];
      const channels = await deps.channels.channels(groupId);
      return channels.map(({ id, type, name, topic }) => ({
        id,
        type,
        name,
        topic,
      }));
    },

    /** The squad's first channel of a type, for links from before channels existed. */
    async firstOfType(user: User, groupId: string, type: ChannelType) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      return deps.channels.firstOfType(groupId, type);
    },

    /** One channel, for a member, with whether they may post in it. */
    async get(user: User, groupId: string, channelId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return null;
      return {
        channel,
        role: ok.me.role,
        canPost: channel.postRule === "EVERYONE" || isAdmin(ok.me.role),
      };
    },

    /**
     * Where a write lands: the named channel when it takes this kind of content and the
     * caller may post there, else the squad's first channel of the first type.
     * Callers have already checked membership and mutes; this checks the channel.
     */
    async place(
      groupId: string,
      role: Role,
      types: ChannelType[],
      channelId?: string | null,
    ): Promise<Result<{ channelId: string }>> {
      const channel = channelId
        ? await deps.channels.find(groupId, channelId)
        : await deps.channels.firstOfType(groupId, types[0]);
      if (!channel || !types.includes(channel.type))
        return failure(
          "NO_CHANNEL",
          "This squad has no channel for that. Ask an admin to add one.",
        );
      if (channel.postRule === "ADMINS" && !isAdmin(role))
        return failure(
          "FORBIDDEN",
          "Only the squad's admins post in this channel.",
        );
      return { ok: true, channelId: channel.id };
    },

    async create(
      user: User,
      groupId: string,
      input: {
        type: ChannelType;
        name: string;
        topic: string | null;
        categoryId: string | null;
        postRule: ChannelPostRule;
      },
    ): Promise<Result<{ channelId: string }>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const name = channelName(input.name);
      if (!name) return BAD_NAME;
      if (
        input.categoryId &&
        !(await deps.channels.findCategory(groupId, input.categoryId))
      )
        return failure("NOT_FOUND", "That category is gone.");
      const [count, max] = await Promise.all([
        deps.channels.count(groupId),
        deps.ownerLimit(ok.group.ownerId, "channelsPerSquad"),
      ]);
      if (count >= max)
        return failure(
          "LIMIT",
          `This squad has ${max} channels, the most its owner's plan allows. Delete one to add another.`,
        );
      const channel = await deps.channels.create({
        groupId,
        categoryId: input.categoryId,
        type: input.type,
        name,
        topic: input.topic,
        postRule: input.postRule,
      });
      return { ok: true, channelId: channel.id };
    },

    /** Rename, retopic, change who posts, or move to another category. */
    async update(
      user: User,
      groupId: string,
      channelId: string,
      input: {
        name?: string;
        topic?: string | null;
        postRule?: ChannelPostRule;
        categoryId?: string | null;
      },
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return GONE;
      const name =
        input.name === undefined ? undefined : channelName(input.name);
      if (name === "") return BAD_NAME;
      const moving =
        input.categoryId !== undefined &&
        input.categoryId !== channel.categoryId;
      if (
        moving &&
        input.categoryId &&
        !(await deps.channels.findCategory(groupId, input.categoryId))
      )
        return failure("NOT_FOUND", "That category is gone.");
      await deps.channels.update(channelId, {
        name,
        topic: input.topic,
        postRule: input.postRule,
      });
      if (moving)
        await deps.channels.moveToCategory(
          groupId,
          channelId,
          input.categoryId ?? null,
        );
      return { ok: true };
    },

    async move(
      user: User,
      groupId: string,
      channelId: string,
      direction: Direction,
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return GONE;
      const other = await deps.channels.neighbour(groupId, channel, direction);
      if (other) await deps.channels.swapChannels(channel, other);
      return { ok: true };
    },

    /** Its messages and material go with it. A squad always keeps one channel. */
    async remove(
      user: User,
      groupId: string,
      channelId: string,
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return GONE;
      if ((await deps.channels.count(groupId)) <= 1)
        return failure(
          "LAST",
          "A squad needs at least one channel. Add another before deleting this one.",
        );
      await deps.channels.softDelete(channelId, deps.clock.now());
      return { ok: true };
    },

    // ---- Categories ------------------------------------------------------------------

    async createCategory(
      user: User,
      groupId: string,
      rawName: string,
    ): Promise<Result<{ categoryId: string }>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const name = rawName.trim().slice(0, 40);
      if (!name) return failure("BAD_NAME", "Give the category a name.");
      const category = await deps.channels.createCategory(groupId, name);
      return { ok: true, categoryId: category.id };
    },

    async renameCategory(
      user: User,
      groupId: string,
      categoryId: string,
      rawName: string,
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const name = rawName.trim().slice(0, 40);
      if (!name) return failure("BAD_NAME", "Give the category a name.");
      if (!(await deps.channels.findCategory(groupId, categoryId)))
        return failure("NOT_FOUND", "That category is gone.");
      await deps.channels.renameCategory(categoryId, name);
      return { ok: true };
    },

    async moveCategory(
      user: User,
      groupId: string,
      categoryId: string,
      direction: Direction,
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const category = await deps.channels.findCategory(groupId, categoryId);
      if (!category) return failure("NOT_FOUND", "That category is gone.");
      const other = await deps.channels.categoryNeighbour(
        groupId,
        category.order,
        direction,
      );
      if (other) await deps.channels.swapCategories(category, other);
      return { ok: true };
    },

    /** Its channels stay, and move to the top of the list. */
    async removeCategory(
      user: User,
      groupId: string,
      categoryId: string,
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      if (!(await deps.channels.findCategory(groupId, categoryId)))
        return failure("NOT_FOUND", "That category is gone.");
      await deps.channels.deleteCategory(groupId, categoryId);
      return { ok: true };
    },
  };
}

export type ChannelService = ReturnType<typeof createChannelService>;
