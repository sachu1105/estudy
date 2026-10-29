import type { Clock } from "@/lib/clock";
import { outranks, type GroupRole } from "@/lib/squads/roles";
import type { GroupRepository } from "@/server/repositories/group-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import {
  SQUAD_CONTENT,
  type ReportRepository,
} from "@/server/repositories/report-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { GroupService } from "./group-service";

type User = Actor;

export type ReportType =
  "GROUP" | "GROUP_ITEM" | "GROUP_TEST" | "USER" | "POST" | "REPLY" | "MESSAGE";

export type ReportDecision = "remove" | "resolve" | "dismiss";

/** How a notification names what was reported: "Someone reported a message in CPO". */
const WHAT: Record<Exclude<ReportType, "GROUP">, string> = {
  GROUP_ITEM: "shared material",
  GROUP_TEST: "a shared test",
  USER: "a member",
  POST: "a post",
  REPLY: "a reply",
  MESSAGE: "a message",
};

const isContent = (type: ReportType) =>
  (SQUAD_CONTENT as readonly string[]).includes(type);

const GONE = failure("NOT_FOUND", "That report has already been handled.");

export type SquadReportDeps = {
  reports: ReportRepository;
  /** Saves a report, once per person per thing. */
  save: GroupRepository["report"];
  groups: Pick<GroupService, "require">;
  isMember: (groupId: string, userId: string) => Promise<boolean>;
  notify: (rows: NewNotification[]) => Promise<void>;
  clock: Clock;
};

/**
 * Reports. Every report reaches the site admins. One about something in a squad, or
 * about one of its people, also goes to that squad's owner, admins and moderators: they
 * know the squad and can act at once. Who reported stays with the site admins, so
 * people can report without fear of the squad's staff. A report about the squad itself
 * stays with the site admins alone: its owner is the one being reported.
 */
export function createSquadReports(deps: SquadReportDeps) {
  /**
   * The squad a report belongs to, read off the reported content itself (never taken
   * from the browser), and only when the reporter is in that squad.
   */
  async function squadOf(
    user: User,
    target: { type: ReportType; id: string; groupId: string | null },
  ) {
    if (target.type === "GROUP") return { groupId: target.id, name: null };
    let groupId: string | null = null;
    if (target.type !== "USER")
      groupId =
        (await deps.reports.locate(target.type, target.id))?.groupId ?? null;
    // A person belongs to the squad they were reported in only if they're in it.
    else if (target.groupId && (await deps.isMember(target.groupId, target.id)))
      groupId = target.groupId;
    if (!groupId) return null;
    const ok = await deps.groups.require(user, groupId, "MEMBER");
    return "error" in ok ? null : { groupId, name: ok.group.name };
  }

  /** The squad's staff, and the rank the viewer holds, or null for anyone else. */
  async function staff(user: User, groupId: string) {
    const ok = await deps.groups.require(user, groupId, "MODERATOR");
    return "error" in ok ? null : (ok.me.role as GroupRole);
  }

  /**
   * Staff handle reports about people they outrank (and anyone who has left), never
   * about themselves: those wait for someone higher, or the site admins.
   */
  async function inReach(
    groupId: string,
    viewer: { id: string; role: GroupRole },
    authorIds: string[],
  ) {
    const people = await deps.reports.people(groupId, authorIds);
    const byId = new Map(people.map((p) => [p.user.id, p]));
    const at = deps.clock.now();
    return {
      byId,
      reach: (authorId: string) => {
        if (authorId === viewer.id) return false;
        const p = byId.get(authorId);
        return !p || outranks(viewer.role, p.role as GroupRole);
      },
      muted: (authorId: string) => {
        const until = byId.get(authorId)?.mutedUntil;
        return !!until && until > at;
      },
    };
  }

  return {
    async file(
      user: User,
      target: { type: ReportType; id: string; groupId: string | null },
      reason: string,
      note: string | null,
    ): Promise<Result<object>> {
      const squad = await squadOf(user, target);
      const again = await deps.reports.exists(user.id, target.type, target.id);
      await deps.save({
        reporterId: user.id,
        targetType: target.type,
        targetId: target.id,
        groupId: squad?.groupId ?? null,
        reason,
        note,
      });
      if (again || !squad?.name || target.type === "GROUP") return { ok: true };

      // The staff hear of it at once; whoever is reported doesn't, staff or not.
      const authorId =
        target.type === "USER"
          ? target.id
          : (await deps.reports.locate(target.type, target.id))?.authorId;
      const staffIds = await deps.reports.staffIds(squad.groupId);
      await deps.notify(
        staffIds
          .filter((id) => id !== authorId && id !== user.id)
          .map((userId) => ({
            userId,
            // Nobody named: the report is anonymous to the squad.
            actorId: null,
            kind: "REPORT" as const,
            groupId: squad.groupId,
            href: `/groups/${squad.groupId}/members#reports`,
            subject: `${WHAT[target.type as Exclude<ReportType, "GROUP">]} in ${squad.name}`,
          })),
      );
      return { ok: true };
    },

    /** Open reports in a squad for its staff, one entry per thing reported. */
    async list(user: User, groupId: string) {
      const role = await staff(user, groupId);
      if (!role) return null;
      const rows = await deps.reports.openInGroup(groupId);
      const byTarget = new Map<string, typeof rows>();
      for (const r of rows) {
        const key = `${r.targetType}:${r.targetId}`;
        byTarget.set(key, [...(byTarget.get(key) ?? []), r]);
      }
      const described = (
        await Promise.all(
          [...byTarget.values()].map(async (reports) => {
            const { targetType, targetId } = reports[0]!;
            const target = await deps.reports.describe(targetType, targetId);
            return target
              ? { type: targetType, id: targetId, target, reports }
              : null;
          }),
        )
      ).filter((x) => x !== null);

      const { byId, reach, muted } = await inReach(
        groupId,
        { id: user.id, role },
        described.map((d) => d.target.authorId),
      );
      return described
        .filter((d) => reach(d.target.authorId))
        .map(({ type, id, target, reports }) => {
          const person = byId.get(target.authorId);
          const reasons = new Map<string, number>();
          for (const r of reports)
            reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
          return {
            type: type as ReportType,
            id,
            label: target.label,
            excerpt: target.excerpt,
            href: target.href,
            hidden: target.hidden,
            author: person
              ? {
                  id: person.user.id,
                  name: person.user.displayName,
                  avatarUrl: person.user.avatarUrl,
                  role: person.role as GroupRole,
                  muted: muted(person.user.id),
                }
              : null,
            reasons: [...reasons].map(([reason, count]) => ({ reason, count })),
            notes: reports.flatMap((r) => (r.note ? [r.note] : [])),
            count: reports.length,
            first: reports[0]!.createdAt,
          };
        });
    },

    /**
     * Staff act on a report: take the content down ("remove"), say they've dealt with a
     * person ("resolve"), or find nothing wrong ("dismiss"). Every open report on it
     * closes, for the site admins too.
     */
    async decide(
      user: User,
      groupId: string,
      target: { type: ReportType; id: string },
      decision: ReportDecision,
    ): Promise<Result<object>> {
      const role = await staff(user, groupId);
      if (!role)
        return failure("FORBIDDEN", "Only the squad's staff handle reports.");
      if (target.type === "GROUP") return GONE;
      if (decision === "remove" && !isContent(target.type))
        return failure("BAD_DECISION", "Mute or remove the member instead.");

      const open = await deps.reports.openInGroup(groupId);
      if (
        !open.some(
          (r) => r.targetType === target.type && r.targetId === target.id,
        )
      )
        return GONE;
      const about = await deps.reports.describe(target.type, target.id);
      if (!about) return GONE;
      const { reach } = await inReach(groupId, { id: user.id, role }, [
        about.authorId,
      ]);
      if (!reach(about.authorId))
        return failure(
          "FORBIDDEN",
          "Someone above you in the squad handles this one.",
        );

      const at = deps.clock.now();
      if (decision === "remove")
        await deps.reports.hide(target.type, target.id, groupId, at);
      await deps.reports.close(
        target.type,
        target.id,
        groupId,
        decision === "dismiss" ? "DISMISSED" : "RESOLVED",
        user.id,
        at,
      );
      return { ok: true };
    },
  };
}

export type SquadReports = ReturnType<typeof createSquadReports>;
