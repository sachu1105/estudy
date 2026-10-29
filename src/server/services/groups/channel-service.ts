import type { Clock } from "@/lib/clock";
import { channelName } from "@/lib/squads/channel-name";
import { canManage, canModerate, type GroupRole } from "@/lib/squads/roles";
import type { ChannelPostRule, ChannelType } from "@/lib/squads/templates";
import type { ChannelRepository } from "@/server/repositories/channel-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { GroupService } from "./group-service";

type User = Actor;
type Direction = "up" | "down";
export type ChannelViewRule = "EVERYONE" | "ADMINS" | "PICKED";
export type NotifyLevel = "ALL" | "MENTIONS" | "MUTE";

/** Who the channel rules are applied to: one member of one squad. */
export type Viewer = { id: string; role: GroupRole };

export type ChannelDeps = {
  groups: GroupService;
  channels: ChannelRepository;
  clock: Clock;
  /** The squad owner's plan sets how many channels a squad holds. */
  ownerLimit: (ownerId: string, feature: "channelsPerSquad") => Promise<number>;
  /** The subjects of an exam's catalogue syllabus, with their topics. */
  examSubjects: (
    examId: string,
  ) => Promise<{ name: string; topics: string[] }[]>;
};

const GONE = failure("NOT_FOUND", "That channel is gone.");
const BAD_NAME = failure(
  "BAD_NAME",
  "Give the channel a name with at least one letter or number.",
);
/** Where a channel per subject goes. */
export const SUBJECTS_CATEGORY = "Subjects";

/** Slow mode choices, in seconds. */
export const SLOW_MODE_MAX = 3600;

/** A squad's channels and categories: who sees them, who posts, who arranges them. */
export function createChannelService(deps: ChannelDeps) {
  const admin = (user: User, groupId: string) =>
    deps.groups.require(user, groupId, "ADMIN");

  /**
   * Whether this person may open a channel at all. A paid channel is listed for every
   * member but opens only for those who run the squad and those holding a live pass.
   */
  async function canSee(
    channel: {
      id: string;
      groupId?: string;
      viewRule: ChannelViewRule;
      pricePaise?: number | null;
    },
    who: Viewer,
  ) {
    if (canModerate(who.role)) return true;
    if (channel.pricePaise != null && channel.groupId)
      return (
        await deps.channels.passChannelIds(
          channel.groupId,
          who.id,
          deps.clock.now(),
        )
      ).has(channel.id);
    if (channel.viewRule === "EVERYONE") return true;
    if (channel.viewRule === "ADMINS") return false;
    return deps.channels.hasAccess(channel.id, who.id);
  }

  return {
    canSee,

    /** Categories in order with their channels; uncategorised channels come first. */
    async layout(user: User, groupId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const role = ok.me.role;
      const staff = canModerate(role);
      const [categories, listed, notify, passes] = await Promise.all([
        deps.channels.categories(groupId),
        deps.channels.channels(groupId, { id: user.id, staff }),
        deps.channels.notifyLevels(user.id, groupId),
        staff
          ? new Set<string>()
          : deps.channels.passChannelIds(groupId, user.id, deps.clock.now()),
      ]);
      // A paid channel shows to everyone, locked until they hold a pass.
      const channels = listed.map((c) => ({
        ...c,
        locked: c.pricePaise !== null && !staff && !passes.has(c.id),
      }));
      const inCategory = (id: string | null) =>
        channels.filter((c) => c.categoryId === id);
      return {
        role,
        canManage: canManage(role),
        notify: Object.fromEntries(notify) as Record<string, NotifyLevel>,
        loose: inCategory(null),
        // A category whose channels this person can't see is left out entirely.
        categories: categories
          .map((c) => ({ ...c, channels: inCategory(c.id) }))
          .filter((c) => c.channels.length > 0 || canManage(role)),
      };
    },

    /** A public squad's open channels, so people see what's inside before joining. */
    async preview(user: User, groupId: string) {
      const found = await deps.groups.memberOf(user, groupId);
      if (!found || found.group.hiddenAt) return [];
      if (!found.membership && found.group.visibility === "PRIVATE") return [];
      const channels = await deps.channels.channels(groupId);
      return channels
        .filter((c) => c.viewRule === "EVERYONE")
        .map(({ id, type, name, topic, pricePaise, accessDays }) => ({
          id,
          type,
          name,
          topic,
          pricePaise,
          accessDays,
        }));
    },

    /** The squad's first channel of a type, for links from before channels existed. */
    async firstOfType(user: User, groupId: string, type: ChannelType) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const channel = await deps.channels.firstOfType(groupId, type);
      if (!channel) return null;
      const who = { id: user.id, role: ok.me.role };
      return (await canSee(channel, who)) ? channel : null;
    },

    /** One channel, for someone who may open it, with whether they may post in it. */
    async get(user: User, groupId: string, channelId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const channel = await deps.channels.find(groupId, channelId);
      const who = { id: user.id, role: ok.me.role };
      if (!channel || !(await canSee(channel, who))) return null;
      return {
        channel,
        role: ok.me.role,
        canPost: channel.postRule === "EVERYONE" || canModerate(ok.me.role),
      };
    },

    /**
     * Where a write lands: the named channel when it takes this kind of content and the
     * caller may open and post in it, else the squad's first channel of the first type.
     * Callers have already checked membership and mutes; this checks the channel.
     */
    async place(
      groupId: string,
      who: Viewer,
      types: ChannelType[],
      channelId?: string | null,
    ): Promise<Result<{ channelId: string; subjectName: string | null }>> {
      const channel = channelId
        ? await deps.channels.find(groupId, channelId)
        : await deps.channels.firstOfType(groupId, types[0]);
      if (
        !channel ||
        !types.includes(channel.type) ||
        !(await canSee(channel, who))
      )
        return failure(
          "NO_CHANNEL",
          "This squad has no channel for that. Ask an admin to add one.",
        );
      if (channel.postRule === "ADMINS" && !canModerate(who.role))
        return failure(
          "FORBIDDEN",
          "Only the squad's admins post in this channel.",
        );
      return {
        ok: true,
        channelId: channel.id,
        subjectName: channel.subjectName,
      };
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
        viewRule?: ChannelViewRule;
        slowModeSec?: number;
        subjectName?: string | null;
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
        viewRule: input.viewRule ?? "EVERYONE",
        slowModeSec: slowMode(input.slowModeSec),
        subjectName: input.subjectName?.trim() || null,
      });
      return { ok: true, channelId: channel.id };
    },

    /** Rename, retopic, change who sees or posts, slow it down, or move it. */
    async update(
      user: User,
      groupId: string,
      channelId: string,
      input: {
        name?: string;
        topic?: string | null;
        postRule?: ChannelPostRule;
        viewRule?: ChannelViewRule;
        slowModeSec?: number;
        subjectName?: string | null;
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
        viewRule: input.viewRule,
        slowModeSec:
          input.slowModeSec === undefined
            ? undefined
            : slowMode(input.slowModeSec),
        subjectName:
          input.subjectName === undefined
            ? undefined
            : input.subjectName?.trim() || null,
      });
      if (moving)
        await deps.channels.moveToCategory(
          groupId,
          channelId,
          input.categoryId ?? null,
        );
      return { ok: true };
    },

    /** The subjects of the squad's exam, for tagging a channel and narrowing topics. */
    async subjects(user: User, groupId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return [];
      const examId = ok.group.exam?.id;
      return examId ? deps.examSubjects(examId) : [];
    },

    /**
     * A channel for every subject of the squad's exam, under one category. Subjects that
     * already have a channel are left alone, so it can be run again after a syllabus grows.
     */
    async addSubjectChannels(
      user: User,
      groupId: string,
    ): Promise<Result<{ added: number }>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const examId = ok.group.exam?.id;
      if (!examId)
        return failure(
          "NO_EXAM",
          "Link this squad to an exam first, in Squad settings.",
        );
      const subjects = await deps.examSubjects(examId);
      if (!subjects.length)
        return failure(
          "NO_SUBJECTS",
          "That exam has no syllabus in the catalogue yet.",
        );
      const existing = await deps.channels.channels(groupId);
      const taken = new Set(existing.map((c) => c.subjectName).filter(Boolean));
      const wanted = subjects.filter((s) => !taken.has(s.name));
      if (!wanted.length) return { ok: true, added: 0 };

      const max = await deps.ownerLimit(ok.group.ownerId, "channelsPerSquad");
      const room = Math.max(0, max - existing.length);
      if (!room)
        return failure(
          "LIMIT",
          `This squad has ${max} channels, the most its owner's plan allows.`,
        );
      const categories = await deps.channels.categories(groupId);
      const category =
        categories.find((c) => c.name === SUBJECTS_CATEGORY) ??
        (await deps.channels.createCategory(groupId, SUBJECTS_CATEGORY));
      for (const subject of wanted.slice(0, room))
        await deps.channels.create({
          groupId,
          categoryId: category.id,
          // One channel does everything: talk, doubts, files, tests, polls.
          type: "CHAT",
          name: channelName(subject.name) || "subject",
          topic: `Talk, doubts and material for ${subject.name}`,
          postRule: "EVERYONE",
          viewRule: "EVERYONE",
          slowModeSec: 0,
          subjectName: subject.name,
        });
      return { ok: true, added: Math.min(room, wanted.length) };
    },

    // ---- Who is let into a private channel -------------------------------------------

    /** The squad's members, and which of them this channel already lets in. */
    async access(user: User, groupId: string, channelId: string) {
      const ok = await admin(user, groupId);
      if ("error" in ok) return null;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return null;
      const [members, picked] = await Promise.all([
        deps.groups.members(user, groupId),
        deps.channels.accessIds(channelId),
      ]);
      const inside = new Set(picked);
      return {
        viewRule: channel.viewRule as ChannelViewRule,
        members: (members?.members ?? []).map((m) => ({
          id: m.user.id,
          name: m.user.displayName,
          role: m.role as GroupRole,
          picked: inside.has(m.user.id),
          // Staff are in every channel already; they can't be taken out.
          always: canModerate(m.role as GroupRole),
        })),
      };
    },

    /** Replaces who is let in by hand. Staff are in regardless. */
    async setAccess(
      user: User,
      groupId: string,
      channelId: string,
      userIds: string[],
    ): Promise<Result<object>> {
      const ok = await admin(user, groupId);
      if ("error" in ok) return ok.error!;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return GONE;
      const members = await deps.groups.members(user, groupId);
      const inSquad = new Set((members?.members ?? []).map((m) => m.user.id));
      await deps.channels.setAccess(
        channelId,
        [...new Set(userIds)].filter((id) => inSquad.has(id)),
      );
      return { ok: true };
    },

    /** How much of a channel reaches this person: everything, mentions, or nothing. */
    async setNotify(
      user: User,
      groupId: string,
      channelId: string,
      level: NotifyLevel,
    ): Promise<Result<object>> {
      const found = await this.get(user, groupId, channelId);
      if (!found) return GONE;
      await deps.channels.setNotify(user.id, channelId, level);
      return { ok: true };
    },

    /** How long this person must wait before writing here again, in seconds. */
    async slowModeWait(
      channel: { id: string; slowModeSec: number },
      who: Viewer,
      lastSentAt: Date | null,
    ) {
      if (!channel.slowModeSec || canModerate(who.role) || !lastSentAt)
        return 0;
      const passed = (deps.clock.now().getTime() - lastSentAt.getTime()) / 1000;
      return Math.max(0, Math.ceil(channel.slowModeSec - passed));
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

/** Whole seconds, never more than an hour. */
const slowMode = (seconds: number | undefined) =>
  Math.min(SLOW_MODE_MAX, Math.max(0, Math.round(seconds ?? 0)));

export type ChannelService = ReturnType<typeof createChannelService>;
