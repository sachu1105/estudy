import type { Clock } from "@/lib/clock";
import {
  examStatus,
  FIRST_REGISTER_NO,
  released,
  resultsAtFor,
  sittingEndsAt,
  type ReleaseChoice,
} from "@/lib/omr/exam";
import { blankMarks, normaliseMarks } from "@/lib/omr/marks";
import { rankList } from "@/lib/omr/rank";
import type { TimerView } from "@/lib/omr/timer";
import type {
  EntryRow,
  ExamRepository,
  ShareRow,
} from "@/server/repositories/exam-repository";
import type { PaperRepository } from "@/server/repositories/paper-repository";

import { failure, type Actor, type Result } from "../syllabus/deps";
import { paperView, scored, shapeOf } from "./paper-view";

export type ExamDeps = {
  exams: ExamRepository;
  papers: Pick<PaperRepository, "findOwned">;
  /** The channel, when this person may open it: whether they may post, and if muted. */
  channel: (
    user: User,
    groupId: string,
    channelId: string,
  ) => Promise<{ canPost: boolean; muted: boolean } | null>;
  clock: Clock;
};

type User = Actor;

/** Marks still land this long after the clock runs out: a tap in flight, a slow phone. */
const GRACE_MS = 30_000;
const NOT_FOUND = failure(
  "NOT_FOUND",
  "That exam is gone or isn't open to you.",
);

export type ShareInput = {
  paperId: string;
  groupId: string;
  channelId: string;
  /** Null: open now. */
  opensAt: Date | null;
  closesAt: Date | null;
  results: ReleaseChoice;
  /** With results "at": when. */
  resultsAt: Date | null;
  showNames: boolean;
};

const seconds = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

/** The sitting's clock as the sheet shows it: started once, never paused or reset. */
function entryTimer(entry: EntryRow | null, now: Date): TimerView {
  if (!entry)
    return { on: false, limitSec: null, elapsedSec: 0, running: false };
  return {
    on: true,
    limitSec: entry.endsAt ? seconds(entry.startedAt, entry.endsAt) : null,
    elapsedSec: seconds(entry.startedAt, now),
    running: true,
  };
}

/**
 * Question papers shared into squad channels as exams. Everyone who can open the channel
 * sits it once for the rank list, with a register number and a clock that can't be
 * reset; the key and the results stay hidden until the results time. Whoever shared it
 * (and the paper's owner) runs it: results early, names on the list, or stop sharing.
 */
export function createExamService(deps: ExamDeps) {
  const now = () => deps.clock.now();

  /** Whether this person may open the exam, and whether they run it. */
  async function reach(user: User, share: ShareRow) {
    if (share.hiddenAt) return null;
    const host =
      share.sharedById === user.id || share.paper.ownerId === user.id;
    const channel = await deps.channel(user, share.groupId, share.channelId);
    return channel || host ? { host } : null;
  }

  /** Hand in a sitting as it stands, at `at` or when its clock ran out if sooner. */
  async function handIn(share: ShareRow, entry: EntryRow, at: Date) {
    const end = entry.endsAt && entry.endsAt < at ? entry.endsAt : at;
    const made = await deps.exams.submitEntry(
      {
        id: entry.id,
        paperId: share.paperId,
        userId: entry.userId,
        marks: normaliseMarks(entry.marks, shapeOf(share.paper)),
      },
      {
        timeUsedSec: seconds(entry.startedAt, end),
        limitSec: entry.endsAt ? seconds(entry.startedAt, entry.endsAt) : null,
      },
    );
    if (made) return made.id;
    return (
      (await deps.exams.entry(share.id, entry.userId))?.submissionId ?? null
    );
  }

  /** Sittings whose clock ran out are handed in as they stand, as the hall collects them. */
  async function collectOverdue(share: ShareRow) {
    for (const entry of await deps.exams.overdue(share.id, now()))
      await handIn(share, entry, now());
  }

  async function myEntry(share: ShareRow, user: User) {
    const entry = await deps.exams.entry(share.id, user.id);
    if (entry && !entry.submissionId && entry.endsAt && entry.endsAt <= now()) {
      const submissionId = await handIn(share, entry, now());
      return { ...entry, submissionId };
    }
    return entry;
  }

  function summary(share: ShareRow, entry: EntryRow | null, host: boolean) {
    const at = now();
    return {
      id: share.id,
      paper: paperView(share.paper),
      squad: share.group,
      channel: { id: share.channel.id, name: share.channel.name },
      sharedBy: share.sharedBy.displayName,
      opensAt: share.opensAt,
      closesAt: share.closesAt,
      resultsAt: share.resultsAt,
      status: examStatus(share, at),
      released: released(share, at),
      showNames: share.showNames,
      host,
      mine: entry
        ? {
            registerNo: entry.registerNo,
            submissionId: entry.submissionId,
            endsAt: entry.endsAt,
          }
        : null,
    };
  }
  async function load(user: User, shareId: string) {
    const share = await deps.exams.find(shareId);
    if (!share) return null;
    const access = await reach(user, share);
    return access ? { share, host: access.host } : null;
  }

  return {
    /** Share one of the person's papers into a channel they can post in. */
    async share(
      user: User,
      input: ShareInput,
    ): Promise<Result<{ id: string }>> {
      const paper = await deps.papers.findOwned(input.paperId, user.id);
      if (!paper) return failure("NOT_FOUND", "That paper isn't yours.");
      const channel = await deps.channel(user, input.groupId, input.channelId);
      if (!channel) return failure("NOT_FOUND", "That channel is gone.");
      if (channel.muted)
        return failure("MUTED", "A squad admin has muted you for now.");
      if (!channel.canPost)
        return failure(
          "FORBIDDEN",
          "Only the squad's admins post in this channel.",
        );
      const at = now();
      const opensAt = input.opensAt && input.opensAt > at ? input.opensAt : at;
      if (
        input.closesAt &&
        input.closesAt.getTime() < opensAt.getTime() + 60_000
      )
        return failure("TIMES", "The exam has to close after it opens.");
      const results = resultsAtFor(
        input.results,
        input.closesAt,
        input.resultsAt,
      );
      if (!results)
        return failure(
          "TIMES",
          input.results === "close"
            ? "Pick when the exam closes, or another time for results."
            : "Pick when the results come out.",
        );
      if (results.resultsAt && results.resultsAt < opensAt)
        return failure(
          "TIMES",
          "Results can't come out before the exam opens.",
        );
      const made = await deps.exams.create({
        paperId: paper.id,
        groupId: input.groupId,
        channelId: input.channelId,
        sharedById: user.id,
        opensAt,
        closesAt: input.closesAt,
        resultsAt: results.resultsAt,
        showNames: input.showNames,
      });
      return { ok: true, id: made.id };
    },

    /** The exams in this person's squads, for the Tests page. */
    async list(user: User) {
      const shares = await deps.exams.forMember(user.id);
      const seen = await Promise.all(shares.map((s) => reach(user, s)));
      return shares.flatMap((share, i) => {
        const access = seen[i];
        if (!access) return [];
        const entry = share.entries[0] ?? null;
        const view = summary(share, entry, access.host);
        // A clock that ran out is as good as handed in; it's collected on the next open.
        const done =
          !!entry?.submissionId || (!!entry?.endsAt && entry.endsAt <= now());
        return [{ ...view, done }];
      });
    },

    /**
     * The exam's page: where it stands, the person's register number, and once results
     * are out (or for whoever runs it) the rank list.
     */
    async view(user: User, shareId: string) {
      const found = await load(user, shareId);
      if (!found) return null;
      const { share, host } = found;
      await collectOverdue(share);
      const entry = await deps.exams.entry(share.id, user.id);
      const view = summary(share, entry, host);
      const started = await deps.exams.countEntries(share.id);
      if (!view.released && !host) return { ...view, started, results: null };
      const rows = (await deps.exams.results(share.id)).map((r) => {
        const score = scored(share.paper, r.submission!.marks);
        return {
          registerNo: r.registerNo,
          name: host || share.showNames ? r.user.displayName : null,
          score: score.score,
          passed: score.passed,
          mine: r.userId === user.id,
          submissionId: r.userId === user.id ? r.submission!.id : null,
        };
      });
      return { ...view, started, results: rankList(rows) };
    },

    /**
     * The sitting: not open yet, closed before they sat it, already handed in, or in
     * progress (or about to start) with its marks and clock.
     */
    async open(user: User, shareId: string) {
      const found = await load(user, shareId);
      if (!found) return null;
      const { share, host } = found;
      const view = summary(share, null, host);
      if (host) return { kind: "host" as const, exam: view };
      if (view.status === "upcoming")
        return { kind: "upcoming" as const, exam: view };
      const entry = await myEntry(share, user);
      if (entry?.submissionId)
        return {
          kind: "done" as const,
          exam: view,
          submissionId: entry.submissionId,
        };
      if (!entry && view.status === "closed")
        return { kind: "closed" as const, exam: view };
      const shape = shapeOf(share.paper);
      return {
        kind: "sitting" as const,
        exam: {
          ...view,
          mine: entry ? summary(share, entry, host).mine : null,
        },
        marks: entry
          ? normaliseMarks(entry.marks, shape)
          : blankMarks(shape.questions),
        timer: entryTimer(entry, now()),
      };
    },

    /** Start the clock: once, for good. Late starters get until the exam closes. */
    async start(
      user: User,
      shareId: string,
    ): Promise<Result<{ timer: TimerView }>> {
      const found = await load(user, shareId);
      if (!found || found.host) return NOT_FOUND;
      const { share } = found;
      const at = now();
      const existing = await myEntry(share, user);
      if (existing?.submissionId)
        return failure("DONE", "You've handed this exam in.");
      if (existing) return { ok: true, timer: entryTimer(existing, at) };
      if (examStatus(share, at) !== "open")
        return failure("CLOSED", "This exam isn't open right now.");
      const entry = await deps.exams.createEntry({
        shareId: share.id,
        userId: user.id,
        marks: blankMarks(share.paper.questionCount),
        startedAt: at,
        endsAt: sittingEndsAt(at, share.paper.limitMin, share.closesAt),
        firstRegisterNo: FIRST_REGISTER_NO,
      });
      return { ok: true, timer: entryTimer(entry, at) };
    },

    /** Marks on the sitting, while its clock runs. */
    async saveMarks(
      user: User,
      shareId: string,
      marks: number[],
    ): Promise<Result<object>> {
      const found = await load(user, shareId);
      if (!found || found.host) return NOT_FOUND;
      const entry = await deps.exams.entry(shareId, user.id);
      if (!entry) return failure("NOT_STARTED", "Start the exam first.");
      if (
        entry.submissionId ||
        (entry.endsAt && now().getTime() > entry.endsAt.getTime() + GRACE_MS)
      )
        return failure("DONE", "Time's up: this sheet has been handed in.");
      const saved = await deps.exams.setEntryMarks(
        entry.id,
        normaliseMarks(marks, shapeOf(found.share.paper)),
      );
      return saved
        ? { ok: true }
        : failure("DONE", "This sheet has been handed in.");
    },

    /** Hand the sitting in, for the rank list. Handing in twice gives the same one. */
    async submit(
      user: User,
      shareId: string,
    ): Promise<Result<{ submissionId: string }>> {
      const found = await load(user, shareId);
      if (!found || found.host) return NOT_FOUND;
      const entry = await deps.exams.entry(shareId, user.id);
      if (!entry) return failure("NOT_STARTED", "Start the exam first.");
      const submissionId =
        entry.submissionId ?? (await handIn(found.share, entry, now()));
      return submissionId
        ? { ok: true, submissionId }
        : failure("DONE", "That sheet couldn't be handed in. Try again.");
    },

    /** Whoever runs the exam: results out now, names on the list, or stop sharing it. */
    async manage(
      user: User,
      shareId: string,
      change:
        { op: "publish" } | { op: "names"; show: boolean } | { op: "stop" },
    ): Promise<Result<object>> {
      const found = await load(user, shareId);
      if (!found?.host)
        return failure(
          "FORBIDDEN",
          "Only whoever shared this exam can change it.",
        );
      if (change.op === "publish")
        await deps.exams.update(shareId, { resultsAt: now() });
      if (change.op === "names")
        await deps.exams.update(shareId, { showNames: change.show });
      if (change.op === "stop")
        await deps.exams.update(shareId, { hiddenAt: now() });
      return { ok: true };
    },

    /**
     * What someone who doesn't own a paper may do with it through exams they can see:
     * view the paper once one has opened; practise on it once they've handed their
     * sitting in (or the exam closed without one), so practice never previews the paper;
     * and see the key once results are out.
     */
    async paperAccess(user: User, paperId: string) {
      const shares = await deps.exams.ofPaper(paperId);
      const at = now();
      const access = { canView: false, canPractise: false, keyOut: false };
      for (const share of shares) {
        const status = examStatus(share, at);
        if (status === "upcoming" || !(await reach(user, share))) continue;
        access.canView = true;
        const entry = await myEntry(share, user);
        if (entry?.submissionId || (!entry && status === "closed"))
          access.canPractise = true;
        if (released(share, at)) access.keyOut = true;
      }
      return access.canView ? access : null;
    },
  };
}

export type ExamService = ReturnType<typeof createExamService>;
