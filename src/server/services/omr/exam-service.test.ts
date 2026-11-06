import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { formatScore } from "@/lib/omr/fraction";
import { BLANK } from "@/lib/omr/marks";
import type { EntryRow, ShareRow } from "@/server/repositories/exam-repository";
import type { PaperRow } from "@/server/repositories/paper-repository";

import { createExamService, type ExamDeps } from "./exam-service";

const teacher = { id: "00000000-0000-4000-8000-00000000000a" } as never;
const ann = { id: "00000000-0000-4000-8000-00000000000b" } as never;
const ben = { id: "00000000-0000-4000-8000-00000000000c" } as never;
const outsider = { id: "00000000-0000-4000-8000-00000000000d" } as never;
const ids = (u: unknown) => (u as { id: string }).id;

/** A 4-question paper, A A A A, PSC marking, cut-off 2, 10 minutes. */
const PAPER: PaperRow = {
  id: "paper-1",
  ownerId: ids(teacher),
  title: "LDC 2022",
  storageKey: "omr/x",
  pageCount: 2,
  questionCount: 4,
  optionCount: 4,
  rightNum: 1,
  rightDen: 1,
  wrongNum: 1,
  wrongDen: 3,
  cutoffNum: 2,
  cutoffDen: 1,
  limitMin: 10,
  answerKey: [1, 1, 1, 1],
  keySource: "OFFICIAL",
  cancelRule: "AWARD",
  keyUpdatedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function setup() {
  const clock = fixedClock("2026-11-07T10:00:00Z");
  const shares = new Map<string, ShareRow>();
  const entries: EntryRow[] = [];
  const submissions = new Map<
    string,
    { marks: number[]; timeUsedSec: number }
  >();
  const members = new Set([ids(teacher), ids(ann), ids(ben)]);
  let n = 0;
  const id = () => `id-${++n}`;

  const exams = {
    async create(data) {
      const row = {
        ...data,
        id: id(),
        hiddenAt: null,
        createdAt: clock.now(),
        paper: PAPER,
        group: { id: data.groupId, name: "Sir's squad" },
        channel: {
          id: data.channelId,
          groupId: data.groupId,
          name: "exams",
          viewRule: "EVERYONE",
          pricePaise: null,
        },
        sharedBy: { id: data.sharedById, displayName: "Teacher" },
      } as ShareRow;
      shares.set(row.id, row);
      return { id: row.id };
    },
    async find(shareId) {
      return shares.get(shareId) ?? null;
    },
    async ofPaper(paperId) {
      return [...shares.values()].filter(
        (s) => s.paperId === paperId && !s.hiddenAt,
      );
    },
    async forMember(userId) {
      return [...shares.values()]
        .filter((s) => !s.hiddenAt && members.has(userId))
        .map((s) => ({
          ...s,
          entries: entries.filter(
            (e) => e.shareId === s.id && e.userId === userId,
          ),
        }));
    },
    async update(shareId, data) {
      Object.assign(shares.get(shareId)!, data);
    },
    async entry(shareId, userId) {
      return (
        entries.find((e) => e.shareId === shareId && e.userId === userId) ??
        null
      );
    },
    async createEntry({ firstRegisterNo, ...data }) {
      const mine = await exams.entry(data.shareId, data.userId);
      if (mine) return mine;
      const taken = entries.filter((e) => e.shareId === data.shareId);
      const row: EntryRow = {
        ...data,
        id: id(),
        registerNo: firstRegisterNo + taken.length,
        submissionId: null,
      };
      entries.push(row);
      return row;
    },
    async setEntryMarks(entryId, marks) {
      const row = entries.find((e) => e.id === entryId && !e.submissionId);
      if (row) row.marks = marks;
      return !!row;
    },
    async submitEntry(entry, data) {
      const row = entries.find((e) => e.id === entry.id)!;
      if (row.submissionId) return null;
      const made = id();
      submissions.set(made, {
        marks: entry.marks,
        timeUsedSec: data.timeUsedSec,
      });
      row.submissionId = made;
      return { id: made };
    },
    async overdue(shareId, now) {
      return entries.filter(
        (e) =>
          e.shareId === shareId &&
          !e.submissionId &&
          e.endsAt &&
          e.endsAt <= now,
      );
    },
    async results(shareId) {
      return entries
        .filter((e) => e.shareId === shareId && e.submissionId)
        .map((e) => ({
          registerNo: e.registerNo,
          userId: e.userId,
          user: { displayName: e.userId === ids(ann) ? "Ann" : "Ben" },
          submission: {
            id: e.submissionId!,
            ...submissions.get(e.submissionId!)!,
          },
        }));
    },
    async countEntries(shareId) {
      return entries.filter((e) => e.shareId === shareId).length;
    },
  } as ExamDeps["exams"];

  const service = createExamService({
    exams,
    papers: {
      async findOwned(paperId, ownerId) {
        return paperId === PAPER.id && ownerId === PAPER.ownerId ? PAPER : null;
      },
    },
    channel: async (user) =>
      members.has(ids(user)) ? { canPost: true, muted: false } : null,
    clock,
  });
  return { service, clock, entries, submissions };
}

const shareInput = {
  paperId: PAPER.id,
  groupId: "group-1",
  channelId: "channel-1",
  opensAt: null,
  closesAt: new Date("2026-11-07T11:00:00Z"),
  results: "close" as const,
  resultsAt: null,
  showNames: false,
};

async function shared(s: ReturnType<typeof setup>) {
  const made = await s.service.share(teacher, shareInput);
  if (!made.ok) throw new Error(made.message);
  return made.id;
}

describe("squad exams", () => {
  it("only the paper's owner shares it, with times that make sense", async () => {
    const s = setup();
    expect((await s.service.share(ann, shareInput)).ok).toBe(false);
    expect(
      (
        await s.service.share(teacher, {
          ...shareInput,
          closesAt: new Date("2026-11-07T09:00:00Z"),
        })
      ).ok,
    ).toBe(false);
    expect(
      (await s.service.share(teacher, { ...shareInput, closesAt: null })).ok,
    ).toBe(false);
    expect((await s.service.share(teacher, shareInput)).ok).toBe(true);
  });

  it("gives register numbers in order and a clock that can't restart", async () => {
    const s = setup();
    const examId = await shared(s);
    expect(await s.service.open(outsider, examId)).toBeNull();
    expect((await s.service.open(teacher, examId))?.kind).toBe("host");

    const before = await s.service.open(ann, examId);
    expect(before?.kind).toBe("sitting");
    const started = await s.service.start(ann, examId);
    expect(started.ok && started.timer.limitSec).toBe(600);
    expect((await s.service.start(ben, examId)).ok).toBe(true);
    expect(s.entries.map((e) => e.registerNo)).toEqual([1001, 1002]);

    // Starting again gives the same clock, still running.
    s.clock.advance(60_000);
    const again = await s.service.start(ann, examId);
    expect(again.ok && again.timer.elapsedSec).toBe(60);

    // Someone outside the squad can't start it (late starters: lib/omr/exam tests).
    s.clock.advance(54 * 60_000);
    const late = { id: "00000000-0000-4000-8000-00000000000e" } as never;
    expect((await s.service.start(late, examId)).ok).toBe(false);
  });

  it("keeps results and the key hidden until the results time, then ranks", async () => {
    const s = setup();
    const examId = await shared(s);
    await s.service.start(ann, examId);
    await s.service.start(ben, examId);
    // Ann: A A A B → 3 right, 1 wrong = 2.67. Ben: A B blank blank → 1 − 1/3.
    expect((await s.service.saveMarks(ann, examId, [0, 0, 0, 1])).ok).toBe(
      true,
    );
    await s.service.saveMarks(ben, examId, [0, 1, BLANK, BLANK]);
    const handed = await s.service.submit(ann, examId);
    expect(handed.ok).toBe(true);
    // Handing in twice gives the same sheet; marks after that don't land.
    const twice = await s.service.submit(ann, examId);
    expect(twice.ok && handed.ok && twice.submissionId).toBe(
      handed.ok && handed.submissionId,
    );
    expect((await s.service.saveMarks(ann, examId, [1, 1, 1, 1])).ok).toBe(
      false,
    );
    expect((await s.service.open(ann, examId))?.kind).toBe("done");

    // Before results: members see no rank list and no key; the teacher sees it all.
    const early = await s.service.view(ann, examId);
    expect(early?.results).toBeNull();
    expect(early?.mine?.registerNo).toBe(1001);
    expect((await s.service.paperAccess(ann, PAPER.id))?.keyOut).toBe(false);
    expect((await s.service.paperAccess(ann, PAPER.id))?.canPractise).toBe(
      true,
    );
    // Ben hasn't handed in: he may view the paper but not practise on it.
    expect((await s.service.paperAccess(ben, PAPER.id))?.canPractise).toBe(
      false,
    );
    const host = await s.service.view(teacher, examId);
    expect(host?.results?.map((r) => r.name)).toEqual(["Ann"]);

    // The exam closes: Ben's sheet is collected as it stands, and results come out.
    s.clock.advance(61 * 60_000);
    const out = await s.service.view(ben, examId);
    expect(out?.released).toBe(true);
    expect(
      out?.results?.map((r) => [
        r.rank,
        r.registerNo,
        formatScore(r.score),
        r.passed,
        r.name,
      ]),
    ).toEqual([
      [1, 1001, "2.67", true, null],
      [2, 1002, "0.67", false, null],
    ]);
    expect(out?.results?.find((r) => r.mine)?.registerNo).toBe(1002);
    // Ben's clock ran out at 10 minutes: that's his time, not the hour since.
    const bens = s.entries.find((e) => e.registerNo === 1002)!;
    expect(s.submissions.get(bens.submissionId!)?.timeUsedSec).toBe(600);
    expect((await s.service.paperAccess(ben, PAPER.id))?.keyOut).toBe(true);
    expect(await s.service.open(outsider, examId)).toBeNull();
  });

  it("lets whoever shared it publish early, show names, and stop sharing", async () => {
    const s = setup();
    const examId = await shared(s);
    await s.service.start(ann, examId);
    await s.service.submit(ann, examId);
    expect((await s.service.manage(ann, examId, { op: "publish" })).ok).toBe(
      false,
    );
    await s.service.manage(teacher, examId, { op: "publish" });
    await s.service.manage(teacher, examId, { op: "names", show: true });
    const view = await s.service.view(ben, examId);
    expect(view?.released).toBe(true);
    expect(view?.results?.[0]?.name).toBe("Ann");
    await s.service.manage(teacher, examId, { op: "stop" });
    expect(await s.service.view(ann, examId)).toBeNull();
    expect(await s.service.list(ann)).toEqual([]);
  });

  it("lists the exams in your squads with where you stand", async () => {
    const s = setup();
    const examId = await shared(s);
    await s.service.start(ann, examId);
    let [listed] = await s.service.list(ann);
    expect(listed?.done).toBe(false);
    expect(listed?.status).toBe("open");
    s.clock.advance(11 * 60_000);
    [listed] = await s.service.list(ann);
    expect(listed?.done).toBe(true);
    expect(await s.service.list(outsider)).toEqual([]);
  });
});
