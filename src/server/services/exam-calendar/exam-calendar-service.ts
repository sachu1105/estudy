import { createHash } from "node:crypto";

import { toLocalDate, type Clock } from "@/lib/clock";
import {
  dueReminders,
  groupDates,
  programmeLinks,
  type DateRow,
  type ExamGroup,
  type ReminderKind,
} from "@/lib/exam-calendar/calendar";
import {
  readPscProgramme,
  type ProgrammePage,
} from "@/lib/exam-calendar/psc-programme";
import type { AuditEntry } from "@/server/repositories/audit-log-repository";
import type {
  ExamCalendarRepository,
  ExamDateFields,
  ExamDateRow,
} from "@/server/repositories/exam-calendar-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";

import { failure, type Actor, type Result } from "../syllabus/deps";

export type ExamCalendarDeps = {
  repo: ExamCalendarRepository;
  clock: Clock;
  /** Our copy of each programme PDF. */
  store: (key: string, bytes: Uint8Array) => Promise<void>;
  fetchPage: (url: string) => Promise<string>;
  fetchPdf: (url: string) => Promise<Uint8Array>;
  readPdf: (bytes: Uint8Array) => Promise<ProgrammePage[]>;
  notify: (rows: NewNotification[]) => Promise<void>;
  audit: (entry: AuditEntry) => Promise<unknown>;
  /** Whether they have an exam pod for this syllabus. */
  ownsSyllabus: (userId: string, syllabusId: string) => Promise<boolean>;
  /** Their exam pods, to tie a followed post to one. */
  examPods: (userId: string) => Promise<{ id: string; title: string }[]>;
};

type Admin = { id: string; ip: string | null };
type Reader = Actor & { timezone: string };

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** A stored row as the calendar's rules see it. */
export function toDateRow(row: ExamDateRow): DateRow {
  return {
    id: row.id,
    board: row.board,
    catNo: row.catNo,
    post: row.post,
    department: row.department,
    scope: row.scope,
    examOn: iso(row.examOn)!,
    timeText: row.timeText,
    confirmFrom: iso(row.confirmFrom),
    confirmTo: iso(row.confirmTo),
    confirmNote: row.confirmNote,
    ticketsFrom: iso(row.ticketsFrom),
    mode: row.mode,
    medium: row.medium,
    duration: row.duration,
    candidates: row.candidates,
    syllabusUrl: row.syllabusUrl,
    cancelled: row.cancelled,
    source: row.programme
      ? { title: row.programme.title, url: row.programme.url }
      : null,
  };
}

const shortDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));

/** "Station Officer (Trainee) - Direct Recruitment" reads better than all capitals. */
export function postName(post: string) {
  if (post !== post.toUpperCase()) return post;
  return post
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, gap: string, c: string) => gap + c.toUpperCase());
}

/** What each reminder says. */
function reminderText(kind: ReminderKind, exam: ExamGroup, today: string) {
  const post = `${postName(exam.post)}${exam.catNo ? ` (${exam.catNo})` : ""}`;
  switch (kind) {
    case "CONFIRM_OPEN":
      return `Confirmation is open till ${shortDate(exam.confirmTo!)}: ${post}`;
    case "CONFIRM_CLOSING":
      return `Confirm by ${shortDate(exam.confirmTo!)} or you can't sit it: ${post}`;
    case "TICKETS":
      return `Admission tickets are out for ${post}, on ${shortDate(exam.examOn)}`;
    case "WEEK_TO_GO": {
      const days = Math.round(
        (Date.parse(exam.examOn) - Date.parse(today)) / 86_400_000,
      );
      return `${post} is on ${shortDate(exam.examOn)}, in ${days} days`;
    }
    case "DAY_BEFORE":
      return `${post} is tomorrow. All the best.`;
    case "CANCELLED":
      return `${post} is cancelled in the board's latest programme`;
  }
}

const CAT_NO = /^\d{1,4}\/\d{4}$/;

/** Just enough of an exam to address a reminder about it. */
function bareExam(catNo: string, post: string, examOn: string): ExamGroup {
  return {
    key: `${catNo}|${examOn}`,
    ids: [],
    board: "",
    catNo,
    post,
    department: null,
    scopes: [],
    examOn,
    timeText: null,
    confirmFrom: null,
    confirmTo: null,
    confirmNote: null,
    ticketsFrom: null,
    mode: null,
    medium: null,
    duration: null,
    candidates: null,
    syllabusUrl: null,
    cancelled: false,
    source: null,
  };
}

/**
 * Exam dates. A board's programmes are found on the page an admin points at, read by
 * rules (lib/exam-calendar), and wait for an admin to publish them; admins can also add
 * a date by hand. People follow the posts they've applied for and get reminded when
 * confirmation opens and closes, when tickets are out, as the exam nears, and when a
 * date moves or a post is cancelled.
 */
export function createExamCalendarService(deps: ExamCalendarDeps) {
  /** Reads one programme PDF and keeps it, PENDING, unless it's been read before. */
  async function readProgramme(input: {
    bytes: Uint8Array;
    url: string | null;
    sourceId: string | null;
    board: string;
  }) {
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    if (await deps.repo.knownProgramme(input.url ?? sha256, sha256))
      return { id: null as string | null, read: null };
    const read = readPscProgramme(await deps.readPdf(input.bytes));
    const storageKey = `exam-programmes/${sha256}.pdf`;
    await deps.store(storageKey, input.bytes);
    const made = await deps.repo.createProgramme({
      sourceId: input.sourceId,
      board: input.board,
      url: input.url,
      storageKey,
      sha256,
      title: read.title,
      month: read.month,
      stage: read.stage,
      notes: read.notes,
      cancelled: read.cancelled,
      problems: read.problems,
      rows: read.rows.map(({ sl: _, ...row }) => ({ ...row, board: input.board })),
    });
    return { id: made.id as string | null, read };
  }

  /** Everyone who follows these posts, once per reminder, with the text for each. */
  async function remind(
    exams: { exam: ExamGroup; kind: ReminderKind | "MOVED"; text: string }[],
  ) {
    const catNos = [...new Set(exams.flatMap((e) => (e.exam.catNo ? [e.exam.catNo] : [])))];
    if (catNos.length === 0) return 0;
    const followers = await deps.repo.followers(catNos);
    const rows: NewNotification[] = [];
    for (const { exam, kind, text } of exams)
      for (const f of followers.filter((f) => f.catNo === exam.catNo))
        if (
          await deps.repo.remember(
            f.user.id,
            exam.catNo!,
            new Date(`${exam.examOn}T00:00:00Z`),
            kind,
          )
        )
          rows.push({
            userId: f.user.id,
            actorId: null,
            kind: "EXAM_DATE",
            groupId: null,
            href: `/exam-dates?cat=${encodeURIComponent(exam.catNo!)}`,
            subject: text,
          });
    // One notification row per reminder: notify() keeps one per person per call.
    for (const row of rows) await deps.notify([row]);
    return rows.length;
  }

  return {
    // ---- The worker -----------------------------------------------------------------

    /** Every enabled source, once: new programme links are read and wait for review. */
    async checkSources() {
      let added = 0;
      const errors: string[] = [];
      for (const source of await deps.repo.enabledSources()) {
        let error: string | null = null;
        try {
          const html = await deps.fetchPage(source.listUrl);
          for (const link of programmeLinks(html, source.listUrl, source.linkText)) {
            if (await deps.repo.knownProgramme(link.url)) continue;
            const made = await readProgramme({
              bytes: await deps.fetchPdf(link.url),
              url: link.url,
              sourceId: source.id,
              board: source.board,
            });
            if (made.id) added++;
          }
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          errors.push(`${source.board}: ${error}`);
        }
        await deps.repo.markChecked(source.id, deps.clock.now(), error);
      }
      return { added, errors };
    },

    /** Today's reminders for everyone following a post with a live date. */
    async runReminders() {
      const now = deps.clock.now();
      const yesterday = new Date(now.getTime() - 86_400_000);
      const exams = groupDates(
        (await deps.repo.upcoming(new Date(`${toLocalDate(yesterday)}T00:00:00Z`))).map(toDateRow),
      ).filter((e) => e.catNo);
      if (exams.length === 0) return 0;
      const followers = await deps.repo.followers(exams.map((e) => e.catNo!));
      let sent = 0;
      for (const exam of exams) {
        const zones = new Set(
          followers.filter((f) => f.catNo === exam.catNo).map((f) => f.user.timezone),
        );
        for (const zone of zones) {
          const today = toLocalDate(now, zone);
          const due = dueReminders(exam, today).map((kind) => ({
            exam,
            kind,
            text: reminderText(kind, exam, today),
          }));
          sent += await remind(due);
        }
      }
      return sent;
    },

    // ---- Admin ----------------------------------------------------------------------

    async adminOverview() {
      const [sources, programmes, handAdded] = await Promise.all([
        deps.repo.sources(),
        deps.repo.programmes(),
        deps.repo.handAdded(),
      ]);
      return { sources, programmes, handAdded: handAdded.map(toDateRow) };
    },

    programme: (id: string) => deps.repo.programme(id),

    /** An admin points at a programme PDF; it's read and waits for review like any. */
    async readFromLink(
      admin: Admin,
      url: string,
      board: string,
    ): Promise<Result<{ id: string }>> {
      let bytes: Uint8Array;
      try {
        bytes = await deps.fetchPdf(url);
      } catch (e) {
        return failure("FETCH", e instanceof Error ? e.message : "That link couldn't be read.");
      }
      const made = await readProgramme({ bytes, url, sourceId: null, board });
      if (!made.id)
        return failure("KNOWN", "That programme has been read already. It's in the list below.");
      await deps.audit({
        actorId: admin.id,
        action: "examDates.read",
        targetId: made.id,
        metadata: { url, rows: made.read?.rows.length ?? 0 },
        ip: admin.ip,
      });
      return { ok: true, id: made.id };
    },

    async setSource(admin: Admin, id: string, enabled: boolean) {
      await deps.repo.setSourceEnabled(id, enabled);
      await deps.audit({
        actorId: admin.id,
        action: enabled ? "examDates.source.on" : "examDates.source.off",
        targetId: id,
        metadata: {},
        ip: admin.ip,
      });
    },

    /** Publishes a programme; followers hear when a date moved or a post is cancelled. */
    async publish(admin: Admin, id: string): Promise<Result<object>> {
      const programme = await deps.repo.programme(id);
      if (!programme) return failure("NOT_FOUND", "That programme is gone.");
      if (programme.status === "PUBLISHED")
        return failure("PUBLISHED", "It's published already.");
      const { moved, cancelled } = await deps.repo.publishProgramme(id, deps.clock.now());
      await deps.repo.setProgrammeStatus(id, "PUBLISHED", admin.id, deps.clock.now());
      const exam = (catNo: string, post: string, examOn: Date) =>
        bareExam(catNo, post, iso(examOn)!);
      await remind([
        ...moved.map((m) => ({
          exam: exam(m.catNo, m.post, m.to),
          kind: "MOVED" as const,
          text: `${postName(m.post)} (${m.catNo}) moved from ${shortDate(iso(m.from)!)} to ${shortDate(iso(m.to)!)}`,
        })),
        ...cancelled.flatMap((c) =>
          c.catNo
            ? [
                {
                  exam: exam(c.catNo, c.post, c.examOn),
                  kind: "CANCELLED" as const,
                  text: `${postName(c.post)} (${c.catNo}) is cancelled in the board's latest programme`,
                },
              ]
            : [],
        ),
      ]);
      await deps.audit({
        actorId: admin.id,
        action: "examDates.publish",
        targetId: id,
        metadata: { rows: programme.dates.length, moved: moved.length, cancelled: cancelled.length },
        ip: admin.ip,
      });
      return { ok: true };
    },

    async reject(admin: Admin, id: string): Promise<Result<object>> {
      const programme = await deps.repo.programme(id);
      if (!programme || programme.status === "PUBLISHED")
        return failure("NOT_PENDING", "Only a programme waiting for review can be rejected.");
      await deps.repo.setProgrammeStatus(id, "REJECTED", admin.id, deps.clock.now());
      await deps.audit({
        actorId: admin.id,
        action: "examDates.reject",
        targetId: id,
        metadata: {},
        ip: admin.ip,
      });
      return { ok: true };
    },

    /** A date added by hand (published at once) or one fixed before or after publishing. */
    async saveDate(
      admin: Admin,
      id: string | null,
      fields: ExamDateFields & { cancelled: boolean },
    ): Promise<Result<{ id: string }>> {
      if (fields.catNo && !CAT_NO.test(fields.catNo))
        return failure("CAT", "A category number looks like 707/2023.");
      if (fields.confirmFrom && fields.confirmTo && fields.confirmTo < fields.confirmFrom)
        return failure("CONFIRM", "Confirmation can't close before it opens.");
      let savedId = id;
      if (id) {
        if (!(await deps.repo.findDate(id))) return failure("NOT_FOUND", "That date is gone.");
        await deps.repo.updateDate(id, fields);
      } else {
        const { cancelled: _, ...rest } = fields;
        savedId = (await deps.repo.createDate(rest, admin.id, deps.clock.now())).id;
      }
      await deps.audit({
        actorId: admin.id,
        action: id ? "examDates.date.update" : "examDates.date.create",
        targetId: savedId!,
        metadata: { catNo: fields.catNo, examOn: fields.examOn },
        ip: admin.ip,
      });
      return { ok: true, id: savedId! };
    },

    async removeDate(admin: Admin, id: string): Promise<Result<object>> {
      const row = await deps.repo.findDate(id);
      if (!row) return failure("NOT_FOUND", "That date is gone.");
      await deps.repo.deleteDate(id);
      await deps.audit({
        actorId: admin.id,
        action: "examDates.date.delete",
        targetId: id,
        metadata: { catNo: row.catNo, examOn: iso(row.examOn) },
        ip: admin.ip,
      });
      return { ok: true };
    },

    // ---- People -----------------------------------------------------------------------

    /** Every live exam from today on, and which of them this person follows. */
    async upcoming(user: Reader) {
      const today = toLocalDate(deps.clock.now(), user.timezone);
      const [rows, follows] = await Promise.all([
        deps.repo.upcoming(new Date(`${today}T00:00:00Z`)),
        deps.repo.follows(user.id),
      ]);
      const followed = new Set(follows.map((f) => f.catNo));
      return {
        today,
        exams: groupDates(rows.map(toDateRow)).map((exam) => ({
          ...exam,
          following: !!exam.catNo && followed.has(exam.catNo),
        })),
      };
    },

    /** The posts this person follows, each with its next live exam (if one is out). */
    async following(user: Reader) {
      const today = toLocalDate(deps.clock.now(), user.timezone);
      const follows = await deps.repo.follows(user.id);
      if (follows.length === 0) return { today, items: [] };
      const exams = groupDates(
        (
          await deps.repo.upcoming(
            new Date(`${today}T00:00:00Z`),
            follows.map((f) => f.catNo),
          )
        ).map(toDateRow),
      );
      return {
        today,
        items: follows
          .map((f) => ({
            catNo: f.catNo,
            pod: f.syllabusVersion,
            next: exams.find((e) => e.catNo === f.catNo) ?? null,
          }))
          .sort((a, b) =>
            (a.next?.examOn ?? "9999").localeCompare(b.next?.examOn ?? "9999"),
          ),
      };
    },

    async follow(
      user: Actor,
      catNo: string,
      syllabusId: string | null,
    ): Promise<Result<object>> {
      if (!CAT_NO.test(catNo))
        return failure("CAT", "A category number looks like 707/2023.");
      if (syllabusId && !(await deps.ownsSyllabus(user.id, syllabusId)))
        return failure("POD", "That exam pod isn't yours.");
      await deps.repo.follow(user.id, catNo, syllabusId);
      return { ok: true };
    },

    unfollow: (user: Actor, catNo: string) => deps.repo.unfollow(user.id, catNo),

    examPods: (user: Actor) => deps.examPods(user.id),
  };
}

export type ExamCalendarService = ReturnType<typeof createExamCalendarService>;
