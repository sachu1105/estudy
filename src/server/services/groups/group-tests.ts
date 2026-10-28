import type { Clock } from "@/lib/clock";
import { spreadQuestions, topicKey } from "@/lib/questions/questions";
import type { GroupTestRepository } from "@/server/repositories/group-test-repository";
import type { QuestionRepository } from "@/server/repositories/question-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { ChannelService, Viewer } from "./channel-service";
import type { GroupService } from "./group-service";

type User = Actor;
const DAY = 86_400_000;

export type GroupTestDeps = {
  groups: GroupService;
  /** Picks and checks the channel a write lands in. */
  channels: Pick<ChannelService, "place">;
  tests: GroupTestRepository;
  questions: QuestionRepository;
  clock: Clock;
  random: () => number;
  /** Weekly XP of these users from the global board (rank service). */
  weeklyXp: (userIds: string[]) => Promise<Map<string, number>>;
  /** Tells the other members a test was shared (notification centre). */
  announce?: (
    groupId: string,
    actorId: string,
    test: { id: string; title: string },
  ) => Promise<void>;
};

const MUTED = failure(
  "MUTED",
  "A squad admin has muted you for now, so you can't share.",
);

/** Tests shared in a group, each member's own copy, and the group's rank (milestone 13). */
export function createGroupTests(deps: GroupTestDeps) {
  async function sharer(user: User, groupId: string) {
    const ok = await deps.groups.require(user, groupId, "MEMBER");
    if ("error" in ok) return { fail: ok.error! } as const;
    if (ok.me.mutedUntil && ok.me.mutedUntil > deps.clock.now())
      return { fail: MUTED } as const;
    return { fail: null, me: ok.me } as const;
  }

  /**
   * The channel a shared test lands in: a tests channel, or a chat, where it goes out as
   * a message (the action that shares it posts that).
   */
  const place = (groupId: string, who: Viewer, channelId: string | null) =>
    deps.channels.place(
      groupId,
      who,
      ["TESTS", "CHAT", "ANNOUNCEMENTS"],
      channelId,
    );

  return {
    async list(user: User, groupId: string, channelId: string | null = null) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const tests = await deps.tests.list(
        groupId,
        await deps.groups.blockedIds(user),
        channelId,
      );
      return Promise.all(
        tests.map(async (t) => {
          const copy = await deps.tests.myCopy(user.id, t.id);
          return {
            ...t,
            mine: copy?.attempts[0] ?? null,
            count: t.questionIds.length,
          };
        }),
      );
    },

    /** Shares one of the user's own tests: the same questions, for everyone to try. */
    async share(
      user: User,
      groupId: string,
      mockTestId: string,
      channelId: string | null = null,
    ): Promise<Result<{ id: string }>> {
      const ok = await sharer(user, groupId);
      if (ok.fail) return ok.fail;
      const channel = await place(
        groupId,
        { id: user.id, role: ok.me.role },
        channelId,
      );
      if (!channel.ok) return channel;
      const test = await deps.questions.findTest(mockTestId, user.id);
      if (!test) return failure("NOT_FOUND", "That test isn't yours.");
      const shared = await deps.tests.create({
        groupId,
        channelId: channel.channelId,
        sharedById: user.id,
        title: test.title,
        questionIds: test.questionIds,
        durationSec: test.durationSec,
        negativeMarking: test.negativeMarking,
      });
      await deps.announce?.(groupId, user.id, shared);
      return { ok: true, id: shared.id };
    },

    /** A custom test from the verified pool on chosen topics. */
    async build(
      user: User,
      groupId: string,
      input: {
        title: string;
        topics: string[];
        count: number;
        minutes: number | null;
      },
      channelId: string | null = null,
    ): Promise<Result<{ id: string }>> {
      const ok = await sharer(user, groupId);
      if (ok.fail) return ok.fail;
      const channel = await place(
        groupId,
        { id: user.id, role: ok.me.role },
        channelId,
      );
      if (!channel.ok) return channel;
      const keys = [...new Set(input.topics.map(topicKey))];
      const pool = await deps.questions.pool(keys);
      if (pool.length < 5)
        return failure(
          "THIN_POOL",
          `Only ${pool.length} practice questions for those topics. Pick more topics.`,
        );
      const picked = spreadQuestions(
        pool,
        keys.map((key) => ({ key, weight: 1 })),
        input.count,
        new Map(),
        deps.random,
      );
      const shared = await deps.tests.create({
        groupId,
        channelId: channel.channelId,
        sharedById: user.id,
        title: input.title,
        questionIds: picked.map((q) => q.id),
        durationSec: input.minutes ? input.minutes * 60 : null,
        negativeMarking: false,
      });
      await deps.announce?.(groupId, user.id, shared);
      return { ok: true, id: shared.id };
    },

    /** Opens the member's own copy of a shared test (made on first open). */
    async take(
      user: User,
      groupId: string,
      groupTestId: string,
    ): Promise<Result<{ testId: string }>> {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return ok.error!;
      const shared = await deps.tests.find(groupId, groupTestId);
      if (!shared)
        return failure("NOT_FOUND", "That test isn't in this squad.");
      const existing = await deps.tests.myCopy(user.id, groupTestId);
      if (existing) return { ok: true, testId: existing.id };
      const copy = await deps.questions.createTest({
        userId: user.id,
        type: "CUSTOM",
        title: shared.title,
        syllabusVersionId: null,
        subjectId: null,
        topicId: null,
        planTaskId: null,
        questionIds: shared.questionIds,
        durationSec: shared.durationSec,
        negativeMarking: shared.negativeMarking,
        groupTestId,
      });
      return { ok: true, testId: copy.id };
    },

    async results(user: User, groupId: string, groupTestId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const shared = await deps.tests.find(groupId, groupTestId);
      if (!shared) return null;
      const blocked = await deps.groups.blockedIds(user);
      const rows = (await deps.tests.results(groupTestId)).filter(
        (r) => !blocked.has(r.user.id),
      );
      return { test: shared, rows };
    },

    /** This week among the members: XP, and right answers in the group's own tests. */
    async rank(user: User, groupId: string) {
      const data = await deps.groups.members(user, groupId);
      if (!data) return null;
      const ids = data.members.map((m) => m.user.id);
      const [xp, correct] = await Promise.all([
        deps.weeklyXp(ids),
        deps.tests.correctSince(
          groupId,
          new Date(deps.clock.now().getTime() - 7 * DAY),
        ),
      ]);
      const rows = data.members
        .map((m) => ({
          user: m.user,
          xp: xp.get(m.user.id) ?? 0,
          correct: correct.get(m.user.id) ?? 0,
          you: m.user.id === user.id,
        }))
        .sort((a, b) => b.xp - a.xp || b.correct - a.correct);
      return rows;
    },
  };
}

export type GroupTests = ReturnType<typeof createGroupTests>;
