import { daysBetween } from "./dates";

// The exam calendar's plain rules, pure and tested: which links on a board's page are
// programmes, how a post's rows become one exam, and which reminders are due today.

/** The programme PDFs a page links to: links ending .pdf whose text names one. */
export function programmeLinks(
  html: string,
  pageUrl: string,
  linkText: string,
) {
  const wanted = linkText.trim().toLowerCase();
  const found = new Map<string, string>();
  for (const [, href, inner] of html.matchAll(
    /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const text = inner!
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!wanted || !text.toLowerCase().includes(wanted)) continue;
    let url: URL;
    try {
      url = new URL(href!.replace(/&amp;/g, "&"), pageUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    if (!/\.pdf$/i.test(url.pathname)) continue;
    if (!found.has(url.href)) found.set(url.href, text);
  }
  return [...found].map(([url, text]) => ({ url, text }));
}

/** One live row of a post on a date, as the calendar shows it (ISO dates). */
export type DateRow = {
  id: string;
  board: string;
  catNo: string | null;
  post: string;
  department: string | null;
  scope: string | null;
  examOn: string;
  timeText: string | null;
  confirmFrom: string | null;
  confirmTo: string | null;
  confirmNote: string | null;
  ticketsFrom: string | null;
  mode: string | null;
  medium: string | null;
  duration: string | null;
  candidates: number | null;
  syllabusUrl: string | null;
  cancelled: boolean;
  source: { title: string; url: string | null } | null;
};

/** An exam as people see it: a post on a date, every district it's held for at once. */
export type ExamGroup = Omit<DateRow, "id" | "scope" | "candidates"> & {
  key: string;
  ids: string[];
  /** "Statewide", or the districts it's held in. */
  scopes: string[];
  candidates: number | null;
};

/** Rows of one post on one date become one exam (a district-wise post is one exam). */
export function groupDates(rows: DateRow[]): ExamGroup[] {
  const groups = new Map<string, ExamGroup>();
  for (const { id, scope, candidates, ...row } of rows) {
    const key = `${row.catNo ?? row.post}|${row.examOn}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        ...row,
        key,
        ids: [id],
        scopes: scope ? [scope] : [],
        candidates,
      });
      continue;
    }
    group.ids.push(id);
    if (scope && !group.scopes.includes(scope)) group.scopes.push(scope);
    if (candidates !== null)
      group.candidates = (group.candidates ?? 0) + candidates;
    group.cancelled = group.cancelled && row.cancelled;
  }
  return [...groups.values()].sort(
    (a, b) => a.examOn.localeCompare(b.examOn) || a.post.localeCompare(b.post),
  );
}

/** Where confirmation stands today: none needed, not open yet, open, or closed. */
export function confirmation(
  exam: Pick<ExamGroup, "confirmFrom" | "confirmTo" | "confirmNote">,
  today: string,
):
  | { state: "none" }
  | { state: "soon"; from: string }
  | { state: "open"; until: string; daysLeft: number }
  | { state: "closed" } {
  if (!exam.confirmTo) return { state: "none" };
  if (exam.confirmFrom && daysBetween(today, exam.confirmFrom) > 0)
    return { state: "soon", from: exam.confirmFrom };
  const daysLeft = daysBetween(today, exam.confirmTo);
  return daysLeft >= 0
    ? { state: "open", until: exam.confirmTo, daysLeft }
    : { state: "closed" };
}

export type ReminderKind =
  | "CONFIRM_OPEN"
  | "CONFIRM_CLOSING"
  | "TICKETS"
  | "WEEK_TO_GO"
  | "DAY_BEFORE"
  | "CANCELLED";

/**
 * The reminders due today for someone who follows this exam. Each is due across a
 * window, not on one day, so a day the worker missed still sends it; the caller sends
 * each kind once.
 */
export function dueReminders(
  exam: Pick<
    ExamGroup,
    | "examOn"
    | "confirmFrom"
    | "confirmTo"
    | "confirmNote"
    | "ticketsFrom"
    | "cancelled"
  >,
  today: string,
): ReminderKind[] {
  const toExam = daysBetween(today, exam.examOn);
  if (toExam < 0) return [];
  if (exam.cancelled) return ["CANCELLED"];
  const due: ReminderKind[] = [];
  const confirm = confirmation(exam, today);
  if (confirm.state === "open")
    due.push(confirm.daysLeft <= 3 ? "CONFIRM_CLOSING" : "CONFIRM_OPEN");
  if (
    exam.ticketsFrom &&
    daysBetween(exam.ticketsFrom, today) >= 0 &&
    toExam > 0
  )
    due.push("TICKETS");
  if (toExam >= 2 && toExam <= 7) due.push("WEEK_TO_GO");
  if (toExam === 1) due.push("DAY_BEFORE");
  return due;
}
