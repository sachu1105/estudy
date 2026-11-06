import type { Clock } from "@/lib/clock";
import type { IdGenerator } from "@/lib/ids";
import { compare, ZERO, type Fraction } from "@/lib/omr/fraction";
import { inkOf, type Pen } from "@/lib/omr/ink";
import { blankKey, normaliseKey } from "@/lib/omr/key";
import { blankMarks, normaliseMarks, type Marks } from "@/lib/omr/marks";
import type { CancelRule } from "@/lib/omr/marking";
import {
  elapsedAt,
  OFF,
  start,
  viewAt,
  type TimerState,
} from "@/lib/omr/timer";
import type { EntitlementSubject } from "@/server/entitlements/resolve";
import type { LimitFeature } from "@/server/entitlements/config";
import type {
  PaperRepository,
  PaperRow,
  SheetRow,
  TimerColumns,
} from "@/server/repositories/paper-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, sha256Hex, type Result } from "../syllabus/deps";
import { sniffKind } from "../syllabus/extract";
import { answerSheetPdf } from "./answer-pdf";
import { paperView, scored, shapeOf, type KeySource } from "./paper-view";

export type OmrDeps = {
  papers: Pick<
    PaperRepository,
    | "create"
    | "listOwned"
    | "find"
    | "findOwned"
    | "sheet"
    | "setMarks"
    | "setTimer"
    | "setSettings"
    | "setKey"
    | "rename"
    | "delete"
    | "bytesUsed"
    | "submit"
    | "submissions"
  >;
  /** Bytes the user already keeps in pods; question papers share that room. */
  podBytesUsed: (ownerId: string) => Promise<number>;
  storage: ObjectStorage;
  ids: IdGenerator;
  clock: Clock;
  limit: (user: EntitlementSubject, feature: LimitFeature) => number;
  pageCount: (bytes: Uint8Array) => Promise<number | null>;
  /**
   * What someone who doesn't own a paper may do with it, through squad exams (the exam
   * service). Left out: only owners open papers.
   */
  access?: (
    user: User,
    paperId: string,
  ) => Promise<{
    canView: boolean;
    canPractise: boolean;
    keyOut: boolean;
  } | null>;
};

type User = EntitlementSubject & { id: string };

export type TimerOp =
  { op: "start"; limitMin: number | null } | { op: "reset" };

export type { KeySource, PaperView } from "./paper-view";

/** How a paper is marked, as the settings form sends it. */
export type SettingsInput = {
  questionCount: number;
  optionCount: number;
  right: Fraction;
  wrong: Fraction;
  cutoff: Fraction | null;
  limitMin: number | null;
  cancelRule: CancelRule;
};

const fromColumns = (row: TimerColumns): TimerState => ({
  on: row.timerOn,
  limitSec: row.timerLimitSec,
  elapsedSec: row.timerElapsedSec,
  runningSince: row.timerRunningSince,
});

const toColumns = (state: TimerState): TimerColumns => ({
  timerOn: state.on,
  timerLimitSec: state.limitSec,
  timerElapsedSec: state.elapsedSec,
  timerRunningSince: state.runningSince,
});

export const PAPER_MAX_BYTES = 25 * 1024 * 1024;
/** Signed links to a paper last this long (rule 15). */
const VIEW_SECONDS = 300;

/**
 * Practice from a question paper: the user uploads its PDF, sets how it's marked and its
 * answer key, and marks an OMR sheet beside it. Handing the sheet in marks it against the
 * key. Private to the user (rule 15); the PDF counts against their pod storage.
 */
export function createOmrService(deps: OmrDeps) {
  const keyPattern = (userId: string) =>
    new RegExp(`^omr/${userId}/[0-9a-f-]{36}$`);

  async function room(user: User, adding: number) {
    const max = deps.limit(user, "vaultStorageBytes");
    const used =
      (await deps.podBytesUsed(user.id)) +
      (await deps.papers.bytesUsed(user.id));
    return used + adding <= max
      ? null
      : failure(
          "STORAGE_FULL",
          `Your storage is full (${Math.round(max / 1024 / 1024)} MB on your plan). Delete a paper or some pod files.`,
        );
  }

  /**
   * The paper and what this person may do with it: everything when it's theirs; through
   * a squad exam, view it, practise on it after their sitting, and see the key once
   * results are out.
   */
  async function reach(user: User, paperId: string) {
    const paper = await deps.papers.find(paperId);
    if (!paper) return null;
    if (paper.ownerId === user.id)
      return { paper, owner: true, canPractise: true, keyOut: true };
    const access = await deps.access?.(user, paperId);
    return access ? { paper, owner: false, ...access } : null;
  }

  /** The paper and the person's own sheet for it, when they may sit it here. */
  async function open(user: User, paperId: string) {
    const reached = await reach(user, paperId);
    if (!reached?.canPractise) return null;
    const { paper } = reached;
    const sheet = await deps.papers.sheet(
      paperId,
      user.id,
      blankMarks(paper.questionCount),
    );
    return { paper, sheet, owner: reached.owner };
  }

  const sheetMarks = (paper: PaperRow, sheet: SheetRow) =>
    normaliseMarks(sheet.marks, shapeOf(paper));

  return {
    async list(user: User) {
      const papers = await deps.papers.listOwned(user.id);
      const now = deps.clock.now();
      return papers.map((p) => {
        const sheet = p.sheets[0];
        const last = p.submissions[0];
        const result = last ? scored(p, last.marks) : null;
        return {
          ...paperView(p),
          updatedAt: new Date(
            Math.max(
              p.updatedAt.getTime(),
              sheet?.updatedAt.getTime() ?? 0,
              last?.createdAt.getTime() ?? 0,
            ),
          ),
          marks: normaliseMarks(sheet?.marks, shapeOf(p)),
          timer: viewAt(sheet ? fromColumns(sheet) : OFF, now),
          last:
            last && result
              ? {
                  id: last.id,
                  score: result.score,
                  max: result.max,
                  passed: result.passed,
                  keyed: result.unkeyed < p.questionCount,
                }
              : null,
        };
      });
    },

    async get(user: User, paperId: string) {
      const opened = await open(user, paperId);
      if (!opened) return null;
      const { paper, sheet } = opened;
      return {
        paper: paperView(paper),
        owner: opened.owner,
        marks: sheetMarks(paper, sheet),
        timer: viewAt(fromColumns(sheet), deps.clock.now()),
      };
    },

    /** The paper with its key, for the owner's key and marking page. */
    async withKey(user: User, paperId: string) {
      const paper = await deps.papers.findOwned(paperId, user.id);
      if (!paper) return null;
      return {
        paper: paperView(paper),
        answerKey: normaliseKey(paper.answerKey, shapeOf(paper)),
      };
    },

    /** Start the timer (with a limit in minutes, or none), or reset it. No pausing. */
    async timer(user: User, paperId: string, input: TimerOp) {
      const opened = await open(user, paperId);
      if (!opened) return null;
      const now = deps.clock.now();
      const next = input.op === "start" ? start(now, input.limitMin) : OFF;
      await deps.papers.setTimer(paperId, user.id, toColumns(next));
      return viewAt(next, now);
    },

    async saveMarks(user: User, paperId: string, marks: number[]) {
      const opened = await open(user, paperId);
      if (!opened) return false;
      return deps.papers.setMarks(
        paperId,
        user.id,
        normaliseMarks(marks, shapeOf(opened.paper)),
      );
    },

    /**
     * How the paper is marked. A change in the number of questions cuts or pads the key
     * and every sheet; fewer options rub out marks and key entries past the last one.
     */
    async saveSettings(
      user: User,
      paperId: string,
      input: SettingsInput,
    ): Promise<Result<object>> {
      const paper = await deps.papers.findOwned(paperId, user.id);
      if (!paper) return failure("NOT_FOUND", "That paper doesn't exist.");
      if (compare(input.right, ZERO) <= 0)
        return failure("INVALID", "A right answer has to earn something.");
      const shape = {
        questions: input.questionCount,
        options: input.optionCount,
      };
      const done = await deps.papers.setSettings(
        paperId,
        user.id,
        {
          questionCount: shape.questions,
          optionCount: shape.options,
          rightNum: input.right.n,
          rightDen: input.right.d,
          wrongNum: input.wrong.n,
          wrongDen: input.wrong.d,
          cutoffNum: input.cutoff?.n ?? null,
          cutoffDen: input.cutoff?.d ?? null,
          limitMin: input.limitMin,
          cancelRule: input.cancelRule,
        },
        (marks) => normaliseMarks(marks, shape),
        normaliseKey(paper.answerKey, shape),
      );
      return done
        ? { ok: true }
        : failure("NOT_FOUND", "That paper doesn't exist.");
    },

    async saveKey(
      user: User,
      paperId: string,
      input: { answerKey: number[]; source: KeySource },
    ) {
      const paper = await deps.papers.findOwned(paperId, user.id);
      if (!paper) return false;
      return deps.papers.setKey(paperId, user.id, {
        answerKey: normaliseKey(input.answerKey, shapeOf(paper)),
        keySource: input.source,
        keyUpdatedAt: deps.clock.now(),
      });
    },

    /**
     * Hand the sheet in. Its marks are kept for good with the time on the clock, and the
     * sheet is cleared, its timer off, ready for another sitting.
     */
    async submit(
      user: User,
      paperId: string,
    ): Promise<Result<{ submissionId: string }>> {
      const opened = await open(user, paperId);
      if (!opened) return failure("NOT_FOUND", "That paper doesn't exist.");
      const { paper, sheet } = opened;
      const timer = fromColumns(sheet);
      const made = await deps.papers.submit(
        paperId,
        user.id,
        {
          marks: sheetMarks(paper, sheet),
          timeUsedSec: timer.on ? elapsedAt(timer, deps.clock.now()) : 0,
          limitSec: timer.on ? timer.limitSec : null,
        },
        blankMarks(paper.questionCount),
      );
      return { ok: true, submissionId: made.id };
    },

    /**
     * One hand-in, marked against the current key, with the answers to look over and
     * every earlier sitting of the same paper.
     */
    async result(user: User, paperId: string, submissionId: string) {
      const reached = await reach(user, paperId);
      if (!reached) return null;
      const { paper } = reached;
      const all = await deps.papers.submissions(paperId, user.id);
      const mine = all.find((s) => s.id === submissionId);
      if (!mine) return null;
      const shape = shapeOf(paper);
      // Before results are out, a squad exam's sheet shows what was marked, never the key.
      const hidden = !reached.keyOut;
      return {
        paper: paperView(paper),
        owner: reached.owner,
        keyOut: !hidden,
        submission: {
          id: mine.id,
          createdAt: mine.createdAt,
          timeUsedSec: mine.timeUsedSec,
          limitSec: mine.limitSec,
          marks: normaliseMarks(mine.marks, shape) as Marks,
        },
        answerKey: hidden ? null : normaliseKey(paper.answerKey, shape),
        score: hidden ? null : scored(paper, mine.marks),
        sittings: all.map((s, i) => ({
          id: s.id,
          number: all.length - i,
          createdAt: s.createdAt,
          score: hidden ? null : scored(paper, s.marks).score,
        })),
      };
    },

    /** A presigned PUT for one PDF; checks type, size and the plan's room. */
    async requestUpload(
      user: User,
      file: { contentType: string; size: number },
    ): Promise<
      Result<{
        upload: { key: string; url: string; headers: Record<string, string> };
      }>
    > {
      if (file.contentType !== "application/pdf")
        return failure("UNSUPPORTED", "Choose a PDF of the question paper.");
      if (file.size > PAPER_MAX_BYTES)
        return failure("TOO_LARGE", "The PDF can be up to 25 MB.");
      const full = await room(user, file.size);
      if (full) return full;
      const key = `omr/${user.id}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: file.contentType,
        contentLength: file.size,
        expiresInSeconds: 600,
      });
      return { ok: true, upload: { key, ...signed } };
    },

    /** The PUT finished: check it really is a PDF, then make the paper and its sheet. */
    async completeUpload(
      user: User,
      input: { key: string; name: string },
    ): Promise<Result<{ paperId: string }>> {
      const bad = failure(
        "UNSUPPORTED",
        "The file didn't upload properly or isn't a PDF. Try again.",
      );
      if (!keyPattern(user.id).test(input.key)) return bad;
      const head = await deps.storage.head(input.key);
      if (!head || head.size > PAPER_MAX_BYTES) return bad;
      const bytes = await deps.storage.getBytes(input.key);
      if (sniffKind(bytes) !== "PDF") {
        await deps.storage.delete(input.key);
        return bad;
      }
      const full = await room(user, 0);
      if (full) {
        await deps.storage.delete(input.key);
        return full;
      }
      const pageCount = await deps.pageCount(bytes).catch(() => null);
      const paper = await deps.papers.create({
        ownerId: user.id,
        title:
          input.name
            .replace(/\.pdf$/i, "")
            .trim()
            .slice(0, 120) || "Question paper",
        storageKey: input.key,
        sizeBytes: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        pageCount,
        answerKey: blankKey(100),
        marks: blankMarks(100),
      });
      return { ok: true, paperId: paper.id };
    },

    async rename(user: User, paperId: string, title: string) {
      return deps.papers.rename(paperId, user.id, title);
    },

    async remove(user: User, paperId: string) {
      const paper = await deps.papers.findOwned(paperId, user.id);
      if (!paper) return false;
      await deps.papers.delete(paperId, user.id);
      await deps.storage.delete(paper.storageKey).catch(() => {});
      return true;
    },

    /** A 5-minute link to the paper, for its owner or someone sitting it in a squad (rule 15). */
    async viewUrl(user: User, paperId: string) {
      const reached = await reach(user, paperId);
      if (!reached) return null;
      return deps.storage.signDownload(reached.paper.storageKey, {
        contentType: "application/pdf",
        expiresInSeconds: VIEW_SECONDS,
      });
    },

    /** The marked sheet as a PDF to keep, in the pen the person marks with. */
    async answerPdf(
      user: User,
      paperId: string,
      options: { pen: Pen; timeZone: string },
    ) {
      const opened = await open(user, paperId);
      if (!opened) return null;
      const { paper, sheet } = opened;
      const printedAt = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: options.timeZone,
      }).format(deps.clock.now());
      const bytes = await answerSheetPdf({
        title: paper.title,
        marks: sheetMarks(paper, sheet),
        options: paper.optionCount,
        ink: inkOf(paper.id),
        pen: options.pen,
        printedAt,
      });
      return { title: paper.title, bytes };
    },
  };
}

export type OmrService = ReturnType<typeof createOmrService>;
