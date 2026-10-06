import type { Clock } from "@/lib/clock";
import type { GroupRepository } from "@/server/repositories/group-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";

type User = Actor;
type Role = "OWNER" | "ADMIN" | "MEMBER";

export type GroupDeps = {
  groups: GroupRepository;
  clock: Clock;
  limit: (user: Actor, feature: "groupsCreated" | "groupsJoined") => number;
  /** An unguessable invite code. */
  newCode: () => string;
};

const NOT_FOUND = failure(
  "NOT_FOUND",
  "That group doesn't exist or isn't open to you.",
);
const NOT_ALLOWED = failure(
  "FORBIDDEN",
  "Only the group's admins can do that.",
);
const RANK: Record<Role, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

/** Groups: who's in, who runs it, how people get in (rule 9 on every action). */
export function createGroupService(deps: GroupDeps) {
  const now = () => deps.clock.now();

  /** The caller's membership, or null. Every action starts here. */
  async function memberOf(user: User, groupId: string) {
    const group = await deps.groups.find(groupId);
    if (!group) return null;
    const membership = await deps.groups.membership(groupId, user.id);
    return { group, membership };
  }

  /** The caller must hold at least `role` in the group. */
  async function require(user: User, groupId: string, role: Role) {
    const found = await memberOf(user, groupId);
    if (!found?.membership) return { error: NOT_FOUND } as const;
    if (RANK[found.membership.role] < RANK[role])
      return { error: NOT_ALLOWED } as const;
    return { group: found.group, me: found.membership } as const;
  }

  async function underJoinLimit(user: User) {
    const max = deps.limit(user, "groupsJoined");
    return (await deps.groups.countJoined(user.id)) < max
      ? null
      : failure(
          "LIMIT",
          `Your plan lets you join ${max} groups. Leave one to join another.`,
        );
  }

  return {
    memberOf,
    require,

    async create(
      user: User,
      input: {
        name: string;
        description: string | null;
        examId: string | null;
        visibility: "PUBLIC" | "PRIVATE";
      },
    ): Promise<Result<{ groupId: string }>> {
      const max = deps.limit(user, "groupsCreated");
      if ((await deps.groups.countOwned(user.id)) >= max)
        return failure(
          "LIMIT",
          `Your plan lets you create ${max} group${max === 1 ? "" : "s"}.`,
        );
      const group = await deps.groups.create({ ...input, ownerId: user.id });
      return { ok: true, groupId: group.id };
    },

    mine: (user: User) => deps.groups.mine(user.id),
    directory: (examId: string | null, query: string) =>
      deps.groups.directory(examId, query.trim()),

    /** What the caller may see: everything as a member; name and size otherwise. */
    async view(user: User, groupId: string) {
      const found = await memberOf(user, groupId);
      if (!found) return null;
      const { group, membership } = found;
      if (!membership && (group.hiddenAt || group.visibility === "PRIVATE")) {
        // A private group's name may be seen through a request or invite, nothing more.
        const request = await deps.groups.myRequest(groupId, user.id);
        if (group.hiddenAt && !request) return null;
        return { group, role: null, request: request?.status ?? null };
      }
      return {
        group,
        role: membership?.role ?? null,
        muted: membership?.mutedUntil ? membership.mutedUntil > now() : false,
        request: null,
      };
    },

    /** Public groups: join at once. Private ones: ask, and an admin decides. */
    async join(
      user: User,
      groupId: string,
    ): Promise<Result<{ joined: boolean }>> {
      const found = await memberOf(user, groupId);
      if (!found || found.group.hiddenAt) return NOT_FOUND;
      if (found.membership) return { ok: true, joined: true };
      const limited = await underJoinLimit(user);
      if (limited) return limited;
      if (found.group.visibility === "PRIVATE") {
        await deps.groups.request(groupId, user.id);
        return { ok: true, joined: false };
      }
      await deps.groups.addMember(groupId, user.id);
      return { ok: true, joined: true };
    },

    /** An invite opens any group, private ones too, while it's valid. */
    async joinByCode(
      user: User,
      code: string,
    ): Promise<Result<{ groupId: string }>> {
      const invite = await deps.groups.inviteByCode(code.trim().toUpperCase());
      const expired = invite?.expiresAt && invite.expiresAt <= now();
      if (!invite || invite.revokedAt || expired || invite.group.deletedAt)
        return failure(
          "BAD_CODE",
          "That invite doesn't work any more. Ask for a new one.",
        );
      if (await deps.groups.membership(invite.groupId, user.id))
        return { ok: true, groupId: invite.groupId };
      const limited = await underJoinLimit(user);
      if (limited) return limited;
      if (!(await deps.groups.useInvite(invite.id, invite.maxUses)))
        return failure(
          "FULL",
          "That invite has been used up. Ask for a new one.",
        );
      await deps.groups.addMember(invite.groupId, user.id);
      return { ok: true, groupId: invite.groupId };
    },

    async leave(user: User, groupId: string): Promise<Result<object>> {
      const found = await memberOf(user, groupId);
      if (!found?.membership) return NOT_FOUND;
      if (found.membership.role === "OWNER")
        return failure(
          "OWNER",
          "The owner can't leave. Delete the group, or make someone else owner first.",
        );
      await deps.groups.removeMember(groupId, user.id);
      return { ok: true };
    },

    async remove(user: User, groupId: string): Promise<Result<object>> {
      const ok = await require(user, groupId, "OWNER");
      if ("error" in ok) return ok.error!;
      await deps.groups.softDelete(groupId, now());
      return { ok: true };
    },

    // ---- Members --------------------------------------------------------------------

    async members(user: User, groupId: string) {
      const ok = await require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const [members, requests, invites] = await Promise.all([
        deps.groups.members(groupId),
        RANK[ok.me.role] >= RANK.ADMIN
          ? deps.groups.pendingRequests(groupId)
          : [],
        RANK[ok.me.role] >= RANK.ADMIN ? deps.groups.invites(groupId) : [],
      ]);
      const at = now();
      return {
        me: ok.me,
        members: members.map((m) => ({
          ...m,
          muted: m.mutedUntil ? m.mutedUntil > at : false,
        })),
        requests,
        invites,
      };
    },

    /**
     * Remove, mute or change role. Admins manage members; only the owner manages admins;
     * nobody acts on someone at or above their own role, or on themselves.
     */
    async manage(
      user: User,
      groupId: string,
      targetId: string,
      action:
        | { kind: "remove" }
        | { kind: "mute"; hours: number | null }
        | { kind: "role"; role: "ADMIN" | "MEMBER" },
    ): Promise<Result<object>> {
      const ok = await require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      const target = await deps.groups.membership(groupId, targetId);
      if (!target || targetId === user.id)
        return failure("NOT_FOUND", "That person isn't in the group.");
      if (RANK[target.role] >= RANK[ok.me.role]) return NOT_ALLOWED;
      if (action.kind === "role" && ok.me.role !== "OWNER")
        return failure("FORBIDDEN", "Only the owner changes who's an admin.");
      if (action.kind === "remove")
        await deps.groups.removeMember(groupId, targetId);
      if (action.kind === "mute")
        await deps.groups.mute(
          groupId,
          targetId,
          action.hours
            ? new Date(now().getTime() + action.hours * 3_600_000)
            : null,
        );
      if (action.kind === "role")
        await deps.groups.setRole(groupId, targetId, action.role);
      return { ok: true };
    },

    async decideRequest(
      user: User,
      requestId: string,
      approve: boolean,
    ): Promise<Result<object>> {
      const request = await deps.groups.findRequest(requestId);
      if (!request || request.status !== "PENDING")
        return failure("NOT_FOUND", "That request is gone.");
      const ok = await require(user, request.groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      await deps.groups.decideRequest(requestId, approve, user.id, now());
      if (approve) await deps.groups.addMember(request.groupId, request.userId);
      return { ok: true };
    },

    async createInvite(
      user: User,
      groupId: string,
      options: { days: number | null; maxUses: number | null },
    ): Promise<Result<{ code: string }>> {
      const ok = await require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      const invite = await deps.groups.createInvite({
        groupId,
        code: deps.newCode(),
        createdById: user.id,
        expiresAt: options.days
          ? new Date(now().getTime() + options.days * 86_400_000)
          : null,
        maxUses: options.maxUses,
      });
      return { ok: true, code: invite.code };
    },

    async revokeInvite(
      user: User,
      groupId: string,
      inviteId: string,
    ): Promise<Result<object>> {
      const ok = await require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      await deps.groups.revokeInvite(inviteId, groupId, now());
      return { ok: true };
    },

    // ---- Blocks and reports ---------------------------------------------------------

    async block(
      user: User,
      otherId: string,
      on: boolean,
    ): Promise<Result<object>> {
      if (otherId === user.id)
        return failure("SELF", "You can't block yourself.");
      if (on) await deps.groups.block(user.id, otherId);
      else await deps.groups.unblock(user.id, otherId);
      return { ok: true };
    },
    blockedIds: (user: User) => deps.groups.blockedIds(user.id),

    report: (
      user: User,
      target: {
        type: "GROUP" | "GROUP_ITEM" | "GROUP_TEST" | "USER";
        id: string;
        groupId: string | null;
      },
      reason: string,
      note: string | null,
    ) =>
      deps.groups.report({
        reporterId: user.id,
        targetType: target.type,
        targetId: target.id,
        groupId: target.groupId,
        reason,
        note,
      }),
  };
}

export type GroupService = ReturnType<typeof createGroupService>;
