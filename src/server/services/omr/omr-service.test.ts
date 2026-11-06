import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { sequentialIds } from "@/lib/ids";
import { formatScore, frac } from "@/lib/omr/fraction";
import { CANCELLED } from "@/lib/omr/key";
import { BLANK } from "@/lib/omr/marks";
import type {
  PaperRow,
  PaperSettings,
  TimerColumns,
} from "@/server/repositories/paper-repository";
import { createMemoryStorage } from "@/server/storage/memory";

import { createOmrService, type OmrDeps } from "./omr-service";

type Paper = PaperRow & { sizeBytes: number };
type Sheet = TimerColumns & {
  paperId: string;
  ownerId: string;
  marks: number[];
  updatedAt: Date;
};
type Submission = {
  id: string;
  paperId: string;
  userId: string;
  marks: number[];
  timeUsedSec: number;
  limitSec: number | null;
  createdAt: Date;
};

const OFF: TimerColumns = {
  timerOn: false,
  timerLimitSec: null,
  timerElapsedSec: 0,
  timerRunningSince: null,
};

/** The paper repository, in memory. */
function memoryPapers(ids: ReturnType<typeof sequentialIds>, now: () => Date) {
  const papers = new Map<string, Paper>();
  const sheets: Sheet[] = [];
  const submissions: Submission[] = [];
  const owned = (id: string, ownerId: string) =>
    papers.get(id)?.ownerId === ownerId ? papers.get(id)! : null;
  const sheetOf = (paperId: string, ownerId: string) =>
    sheets.find((s) => s.paperId === paperId && s.ownerId === ownerId);

  const repo: OmrDeps["papers"] = {
    async create(data) {
      const id = ids.next();
      const { marks, ...rest } = data;
      papers.set(id, {
        ...rest,
        id,
        questionCount: 100,
        optionCount: 4,
        rightNum: 1,
        rightDen: 1,
        wrongNum: 1,
        wrongDen: 3,
        cutoffNum: null,
        cutoffDen: null,
        limitMin: 75,
        keySource: "OWN",
        cancelRule: "AWARD",
        keyUpdatedAt: null,
        createdAt: now(),
        updatedAt: now(),
      });
      sheets.push({
        paperId: id,
        ownerId: data.ownerId,
        marks,
        updatedAt: now(),
        ...OFF,
      });
      return { id };
    },
    async listFor(userId, paperIds = []) {
      return [...papers.values()]
        .filter((p) => p.ownerId === userId || paperIds.includes(p.id))
        .map((p) => {
          const mine = submissions.filter(
            (s) => s.paperId === p.id && s.userId === userId,
          );
          return {
            ...p,
            sheets: sheets.filter(
              (s) => s.paperId === p.id && s.ownerId === userId,
            ),
            submissions: [...mine].reverse().slice(0, 1),
            _count: { submissions: mine.length },
          };
        });
    },
    async find(id) {
      return papers.get(id) ?? null;
    },
    async findOwned(id, ownerId) {
      return owned(id, ownerId);
    },
    async sheet(paperId, ownerId, blank) {
      let sheet = sheetOf(paperId, ownerId);
      if (!sheet) {
        sheet = { paperId, ownerId, marks: blank, updatedAt: now(), ...OFF };
        sheets.push(sheet);
      }
      return sheet;
    },
    async setMarks(paperId, ownerId, marks) {
      const sheet = sheetOf(paperId, ownerId);
      if (sheet) sheet.marks = marks;
      return !!sheet;
    },
    async setTimer(paperId, ownerId, timer) {
      const sheet = sheetOf(paperId, ownerId);
      if (sheet) Object.assign(sheet, timer);
      return !!sheet;
    },
    async setSettings(id, ownerId, settings: PaperSettings, reshape, key) {
      const paper = owned(id, ownerId);
      if (!paper) return false;
      Object.assign(paper, settings, { answerKey: key });
      for (const s of sheets.filter((s) => s.paperId === id))
        s.marks = reshape(s.marks);
      return true;
    },
    async setKey(id, ownerId, data) {
      const paper = owned(id, ownerId);
      if (paper) Object.assign(paper, data);
      return !!paper;
    },
    async rename(id, ownerId, title) {
      const paper = owned(id, ownerId);
      if (paper) paper.title = title;
      return !!paper;
    },
    async delete(id, ownerId) {
      return !!owned(id, ownerId) && papers.delete(id);
    },
    async bytesUsed(ownerId) {
      return [...papers.values()]
        .filter((p) => p.ownerId === ownerId)
        .reduce((n, p) => n + p.sizeBytes, 0);
    },
    async submit(paperId, userId, data, blank) {
      const id = ids.next();
      submissions.push({ id, paperId, userId, ...data, createdAt: now() });
      const sheet = sheetOf(paperId, userId);
      if (sheet) Object.assign(sheet, { marks: blank, ...OFF });
      return { id };
    },
    async submissions(paperId, userId) {
      return submissions
        .filter((s) => s.paperId === paperId && s.userId === userId)
        .reverse();
    },
  } as OmrDeps["papers"];
  return { repo, papers, sheets, submissions };
}

function setup(room = 10_000) {
  const { storage, objects } = createMemoryStorage();
  const ids = sequentialIds();
  const clock = fixedClock("2026-10-26T04:30:00Z");
  const db = memoryPapers(ids, () => clock.now());
  const service = createOmrService({
    papers: db.repo,
    podBytesUsed: async () => 0,
    storage,
    ids,
    clock,
    limit: () => room,
    pageCount: async () => 3,
  });
  return { service, objects, db, clock };
}

const user = { id: "00000000-0000-4000-8000-0000000000aa" } as never;
const other = { id: "00000000-0000-4000-8000-0000000000bb" } as never;
const pdf = new TextEncoder().encode("%PDF-1.7 a question paper");

async function uploaded(s: ReturnType<typeof setup>, body = pdf) {
  const signed = await s.service.requestUpload(user, {
    contentType: "application/pdf",
    size: body.byteLength,
  });
  if (!signed.ok) throw new Error(signed.message);
  s.objects.set(signed.upload.key, { body, contentType: "application/pdf" });
  return signed.upload.key;
}

async function paper(s: ReturnType<typeof setup>) {
  const made = await s.service.completeUpload(user, {
    key: await uploaded(s),
    name: "p.pdf",
  });
  if (!made.ok) throw new Error(made.message);
  return made.paperId;
}

const settings = {
  questionCount: 100,
  optionCount: 4,
  right: frac(1),
  wrong: frac(1, 3),
  cutoff: null,
  limitMin: 75,
  cancelRule: "AWARD" as const,
};

describe("question papers", () => {
  it("takes a PDF and gives it a blank 100-question sheet, marked the PSC way", async () => {
    const s = setup();
    const key = await uploaded(s);
    const made = await s.service.completeUpload(user, {
      key,
      name: "LDC 2024 Paper.pdf",
    });
    expect(made.ok).toBe(true);
    const opened = await s.service.get(
      user,
      (made as { paperId: string }).paperId,
    );
    expect(opened?.paper.title).toBe("LDC 2024 Paper");
    expect(opened?.paper.pageCount).toBe(3);
    expect(opened?.paper.shape).toEqual({ questions: 100, options: 4 });
    expect(opened?.paper.marking.wrong).toEqual(frac(1, 3));
    expect(opened?.paper.keyed).toBe(0);
    expect(opened?.marks).toHaveLength(100);
    expect(opened?.marks.every((m) => m === BLANK)).toBe(true);
  });

  it("refuses anything that isn't a PDF, and deletes what arrived", async () => {
    const s = setup();
    expect(
      (
        await s.service.requestUpload(user, {
          contentType: "image/png",
          size: 10,
        })
      ).ok,
    ).toBe(false);
    const key = await uploaded(s, new TextEncoder().encode("not a pdf at all"));
    const made = await s.service.completeUpload(user, { key, name: "x.pdf" });
    expect(made.ok).toBe(false);
    expect(s.objects.has(key)).toBe(false);
  });

  it("keeps to the plan's storage", async () => {
    const s = setup(10);
    const signed = await s.service.requestUpload(user, {
      contentType: "application/pdf",
      size: 11,
    });
    expect(signed.ok).toBe(false);
  });

  it("keeps each paper, its key and its results to its owner", async () => {
    const s = setup();
    const id = await paper(s);
    const storageKey = s.db.papers.get(id)!.storageKey;
    // Someone else's upload key never completes for this user.
    expect(
      (await s.service.completeUpload(other, { key: storageKey, name: "p" }))
        .ok,
    ).toBe(false);
    expect(await s.service.get(other, id)).toBeNull();
    expect(await s.service.withKey(other, id)).toBeNull();
    expect(await s.service.viewUrl(other, id)).toBeNull();
    expect(
      await s.service.answerPdf(other, id, { pen: "blue", timeZone: "UTC" }),
    ).toBeNull();
    expect(await s.service.saveMarks(other, id, [1])).toBe(false);
    expect(
      await s.service.saveKey(other, id, { answerKey: [1], source: "OWN" }),
    ).toBe(false);
    expect((await s.service.saveSettings(other, id, settings)).ok).toBe(false);
    expect((await s.service.submit(other, id)).ok).toBe(false);
    expect(await s.service.remove(other, id)).toBe(false);
    // Opening someone else's paper doesn't give them a sheet for it.
    expect(s.db.sheets).toHaveLength(1);

    expect(await s.service.saveMarks(user, id, [1, 9, 3])).toBe(true);
    expect((await s.service.get(user, id))?.marks.slice(0, 4)).toEqual([
      1,
      BLANK,
      3,
      BLANK,
    ]);
    const made = await s.service.answerPdf(user, id, {
      pen: "blue",
      timeZone: "Asia/Kolkata",
    });
    expect(new TextDecoder().decode(made?.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(await s.service.remove(user, id)).toBe(true);
    expect(s.objects.has(storageKey)).toBe(false);
    expect(s.db.papers.size).toBe(0);
  });

  it("keeps time on the server: a reload sees the clock still running", async () => {
    const s = setup();
    const id = await paper(s);
    expect((await s.service.get(user, id))?.timer.on).toBe(false);
    expect(
      await s.service.timer(user, id, { op: "start", limitMin: 75 }),
    ).toEqual({ on: true, limitSec: 4500, elapsedSec: 0, running: true });
    s.clock.advance(90_000);
    expect((await s.service.get(user, id))?.timer.elapsedSec).toBe(90);
    s.clock.advance(10_000);
    expect((await s.service.list(user))[0]?.timer.elapsedSec).toBe(100);
    expect(await s.service.timer(other, id, { op: "reset" })).toBeNull();
    expect((await s.service.timer(user, id, { op: "reset" }))?.on).toBe(false);
  });

  it("reshapes the key and the sheet when the paper's shape changes", async () => {
    const s = setup();
    const id = await paper(s);
    await s.service.saveMarks(user, id, [4 - 1, 2]);
    await s.service.saveKey(user, id, {
      answerKey: [8, 4, CANCELLED],
      source: "OFFICIAL",
    });
    expect((await s.service.withKey(user, id))?.paper.keySource).toBe(
      "OFFICIAL",
    );
    const saved = await s.service.saveSettings(user, id, {
      ...settings,
      questionCount: 120,
      optionCount: 5,
      cutoff: frac(181, 4),
    });
    expect(saved.ok).toBe(true);
    const opened = await s.service.withKey(user, id);
    expect(opened?.paper.shape).toEqual({ questions: 120, options: 5 });
    expect(opened?.paper.marking.cutoff).toEqual(frac(181, 4));
    expect(opened?.answerKey).toHaveLength(120);
    expect(opened?.answerKey.slice(0, 3)).toEqual([8, 4, CANCELLED]);
    expect((await s.service.get(user, id))?.marks).toHaveLength(120);

    // Back to four options: anything keyed or marked E goes.
    await s.service.saveKey(user, id, { answerKey: [16 | 1], source: "OWN" });
    await s.service.saveMarks(user, id, [4]);
    await s.service.saveSettings(user, id, { ...settings, questionCount: 50 });
    expect((await s.service.withKey(user, id))?.answerKey[0]).toBe(1);
    expect((await s.service.get(user, id))?.marks[0]).toBe(BLANK);

    expect(
      (await s.service.saveSettings(user, id, { ...settings, right: frac(0) }))
        .ok,
    ).toBe(false);
  });

  it("hands a sheet in, clears it for the next sitting, and marks it against the key", async () => {
    const s = setup();
    const id = await paper(s);
    await s.service.saveSettings(user, id, {
      ...settings,
      questionCount: 4,
      cutoff: frac(2),
    });
    await s.service.timer(user, id, { op: "start", limitMin: 10 });
    await s.service.saveMarks(user, id, [0, 1, BLANK, 0]);
    s.clock.advance(125_000);

    const handed = await s.service.submit(user, id);
    if (!handed.ok) throw new Error(handed.message);
    // The sheet is clean and the clock off for another go.
    const after = await s.service.get(user, id);
    expect(after?.marks.every((m) => m === BLANK)).toBe(true);
    expect(after?.timer.on).toBe(false);

    // No key yet: nothing can be scored.
    let result = await s.service.result(user, id, handed.submissionId);
    expect(result?.submission.timeUsedSec).toBe(125);
    expect(result?.submission.limitSec).toBe(600);
    expect(result?.score?.unkeyed).toBe(4);
    expect(result?.score?.passed).toBeNull();

    // A, A, A, cancelled: 2 right, 1 wrong, 1 blank... and the cancelled one is awarded.
    await s.service.saveKey(user, id, {
      answerKey: [1, 1, 1, CANCELLED],
      source: "OWN",
    });
    result = await s.service.result(user, id, handed.submissionId);
    expect(result?.score?.outcomes).toEqual([
      "right",
      "wrong",
      "blank",
      "cancelled",
    ]);
    expect(formatScore(result!.score!.score)).toBe("1.67");
    expect(result?.score?.passed).toBe(false);
    expect(result?.answerKey).toEqual([1, 1, 1, CANCELLED]);
    expect(result?.sittings).toHaveLength(1);

    // The Tests page shows the last result, and that it's been attempted once.
    const [listed] = await s.service.list(user);
    expect(listed?.last?.id).toBe(handed.submissionId);
    expect(listed?.last?.score).toEqual(frac(5, 3));
    expect(listed?.attempts).toBe(1);
    expect(listed?.owner).toBe(true);
    // Someone given the paper (a bundle) sees it too, not yet attempted, not theirs.
    expect(await s.service.list(other)).toEqual([]);
    const [given] = await s.service.list(other, [id]);
    expect(given).toMatchObject({ id, owner: false, attempts: 0, last: null });

    // A second sitting without a clock still hands in, with no time on it.
    await s.service.saveMarks(user, id, [0, 0, 0, 0]);
    const again = await s.service.submit(user, id);
    if (!again.ok) throw new Error(again.message);
    result = await s.service.result(user, id, again.submissionId);
    expect(result?.submission.timeUsedSec).toBe(0);
    expect(result?.score?.passed).toBe(true);
    expect(result?.sittings.map((x) => x.number)).toEqual([2, 1]);
    expect((await s.service.list(user))[0]?.attempts).toBe(2);

    expect(await s.service.result(other, id, again.submissionId)).toBeNull();
    expect(await s.service.result(user, id, "nope")).toBeNull();
  });
});
