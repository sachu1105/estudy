import { datesIn, monthStart, withoutDates } from "./dates";

// Reads a Kerala PSC "Examination Programme" PDF by rules (no AI: it isn't one of AI's
// four jobs, and the programme is a table). Pure: it takes each page's words with their
// positions, as PDF.js gives them, and returns the exams in it.
//
// How the table reads: a header row names the columns ("Sl. No.", "Cat. No.", "Name of
// Post", ... "Date of Examination", "Date of Confirmation", ...); their positions move
// from one programme to the next, so each word goes in the column whose header it sits
// under. Every cell is centred on its row, so the serial number marks each row's middle,
// and the widest band of white space between two serial numbers is where one row ends
// and the next begins. A cell merged across rows (a post written once for every
// district, a "common test" date) is printed once in the middle, so it's filled in
// afterwards for every row it spans.

export type TextItem = { str: string; x: number; y: number; w: number };
export type PageLink = { url: string; x: number; y: number };
export type ProgrammePage = { items: TextItem[]; links: PageLink[] };

export type ProgrammeStage =
  "FOR_CONFIRMATION" | "AFTER_CONFIRMATION" | "MODIFIED" | "OTHER";

export type ProgrammeRow = {
  /** The serial number, as printed. */
  sl: number;
  catNo: string | null;
  post: string;
  department: string | null;
  scope: string | null;
  /** ISO dates (yyyy-mm-dd). */
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
};

export type ReadProgramme = {
  title: string;
  /** The first day of the month it covers. */
  month: string | null;
  stage: ProgrammeStage;
  notes: string[];
  /** Category numbers it cancels: in its notes, or rows marked deleted. */
  cancelled: string[];
  rows: ProgrammeRow[];
  /** What couldn't be read, for the admin who reviews it. */
  problems: string[];
};

type Column =
  | "sl"
  | "cat"
  | "post"
  | "dept"
  | "scope"
  | "exam"
  | "confirm"
  | "tickets"
  | "mode"
  | "medium"
  | "duration"
  | "candidates"
  | "syllabus";

/** Which header words name which column. The first match on a page wins. */
const HEADERS: [Column, RegExp][] = [
  ["sl", /^sl\.?\s*no/i],
  ["cat", /^cat\.?(\s*no\.?)?$/i],
  ["post", /name of (the )?post/i],
  ["dept", /^department/i],
  ["scope", /statewide|district/i],
  ["exam", /^examination$|date and time/i],
  ["confirm", /^confirmation$/i],
  ["tickets", /^admission$|^tickets$/i],
  ["mode", /^mode of exam/i],
  ["medium", /^medium of/i],
  ["duration", /^duration$/i],
  ["candidates", /^candidates$/i],
  ["syllabus", /^link for$/i],
];

const center = (i: { x: number; w: number }) => i.x + i.w / 2;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
/** Footer and sheet furniture, never part of a row. */
const FURNITURE = /^(page \d+|sheet[ _]?\d+|examination programme)$/i;
const WEEKDAY =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
/** "707/2023", but not the "05/2024" inside a date like 03/05/2024. */
const CAT = /(?<![\d/])(\d{1,4}\/\d{4})(?![\d/])/;
/** "Common Test for Serial Numbers 5 to 18", "SL. NO. 1 TO 3", "... 40 and 41". */
const COMMON =
  /common test for (?:the )?(?:serial numbers?|sl\.?\s*nos?\.?)\s*(\d+)\s*(?:to|-|and|&)\s*(\d+)/gi;

/** Words that sit on one line (within 2pt), top to bottom, left to right, as text. */
function lines(items: TextItem[]) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out: { y: number; text: string }[] = [];
  for (const item of sorted) {
    const last = out.at(-1);
    if (last && Math.abs(last.y - item.y) <= 2)
      last.text = `${last.text} ${item.str}`;
    else out.push({ y: item.y, text: item.str });
  }
  return out.map((l) => ({ y: l.y, text: clean(l.text) }));
}

const text = (items: TextItem[]) =>
  clean(
    lines(items)
      .map((l) => l.text)
      .join(" "),
  ).replace(/\s*–\s*/g, " – ");

function findHeader(page: ProgrammePage) {
  const sl = page.items.find((i) => /^sl\.?\s*no/i.test(i.str.trim()));
  if (!sl) return null;
  const band = page.items.filter(
    (i) => i.y <= sl.y + 18 && i.y >= sl.y - 18 && i.str.trim(),
  );
  const columns = new Map<Column, number>();
  for (const item of band)
    for (const [column, pattern] of HEADERS)
      if (!columns.has(column) && pattern.test(item.str.trim()))
        columns.set(column, center(item));
  return {
    columns,
    top: Math.max(...band.map((i) => i.y)),
    bottom: Math.min(...band.map((i) => i.y)),
  };
}

function nearest(
  columns: Map<Column, number>,
  x: number,
  skip: Column[] = [],
): Column {
  let best: Column = "post";
  let distance = Infinity;
  for (const [column, cx] of columns)
    if (!skip.includes(column) && Math.abs(cx - x) < distance) {
      distance = Math.abs(cx - x);
      best = column;
    }
  return best;
}

/**
 * The column a word belongs in. The serial and category columns only ever hold numbers,
 * so a word that lands there by position (a short post name like "CLERK", printed at
 * the post column's left edge) goes to the nearest column that holds words.
 */
function columnOf(columns: Map<Column, number>, item: TextItem): Column {
  const column = nearest(columns, center(item));
  const value = item.str.trim();
  if (column === "sl" && !/^\d{1,4}$/.test(value))
    return nearest(columns, center(item), ["sl", "cat"]);
  if (column === "cat" && !CAT.test(value) && !/^[\d/.-]+$/.test(value))
    return nearest(columns, center(item), ["sl", "cat"]);
  return column;
}

/**
 * Where one row ends and the next begins: the middle of the widest gap between them.
 * A date in the exam column always starts the lower row's cell, so the break is never
 * below one (`floor`): a one-point-wider gap under it can't steal its line.
 */
function boundary(
  upper: number,
  lower: number,
  ys: number[],
  floor = -Infinity,
) {
  const between = [
    upper,
    ...ys.filter((y) => y < upper && y > lower).sort((a, b) => b - a),
    lower,
  ];
  let best = (upper + lower) / 2;
  let widest = -1;
  for (let i = 1; i < between.length; i++) {
    if (between[i]! < floor) break;
    const gap = between[i - 1]! - between[i]!;
    if (gap > widest) {
      widest = gap;
      best = (between[i - 1]! + between[i]!) / 2;
    }
  }
  return best;
}

const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];
/** Other spellings the programmes use, squeezed (letters only, lower case). */
const DISTRICT_SPELLINGS: Record<string, string> = {
  thiruvanathapuram: "Thiruvananthapuram",
  trivandrum: "Thiruvananthapuram",
  alapuzha: "Alappuzha",
  alleppey: "Alappuzha",
  kozhikkode: "Kozhikode",
  calicut: "Kozhikode",
  kasargode: "Kasaragod",
  kasargod: "Kasaragod",
  kasaragode: "Kasaragod",
  palghat: "Palakkad",
  trichur: "Thrissur",
};

/** "THIRUVANANTH APURAM" -> "Thiruvananthapuram"; "STATEWIDE" -> "Statewide". */
export function scopeOf(raw: string) {
  const value = clean(raw);
  if (!value) return null;
  if (/state\s*wide/i.test(value)) return "Statewide";
  const squeezed = value.toLowerCase().replace(/[^a-z]/g, "");
  return (
    DISTRICTS.find((d) => d.toLowerCase() === squeezed) ??
    DISTRICT_SPELLINGS[squeezed] ??
    value
  );
}

/** Splits "583/2022 Lecturer in Violin" into the number and the words after it. */
function splitCatItems(items: TextItem[]) {
  return items.flatMap((item) => {
    const match = /^(\d{1,4}\/\d{4})\s+(\S.*)$/.exec(item.str.trim());
    if (!match) return [item];
    const share = match[1]!.length / item.str.trim().length;
    const catW = Math.round(item.w * share);
    return [
      { ...item, str: match[1]!, w: catW },
      { ...item, str: match[2]!, x: item.x + catW + 3, w: item.w - catW - 3 },
    ];
  });
}

/** A row as read, before merged cells are filled in from the rows they span. */
type Draft = Omit<ProgrammeRow, "examOn" | "post"> & {
  examOn: string | null;
  post: string | null;
  /** The date column says the exam was deleted, cancelled or postponed. */
  dropped: boolean;
};

const commonRanges = (value: string) =>
  [...value.matchAll(COMMON)].map(
    ([, a, b]) => [Number(a), Number(b)] as const,
  );
const withoutCommon = (value: string) => clean(value.replace(COMMON, " "));

function draftFrom(
  sl: number,
  cells: Map<Column, TextItem[]>,
  links: PageLink[],
  syllabusX: number | undefined,
): Draft {
  const cell = (c: Column) => withoutCommon(text(cells.get(c) ?? []));
  const exam = cell("exam");
  const examOn = datesIn(exam)[0] ?? null;
  const confirm = cell("confirm");
  const confirmDates = datesIn(confirm);
  const time = clean(
    withoutDates(exam)
      .replace(WEEKDAY, " ")
      .replace(/^[,&\s]+/, ""),
  );
  const syllabus =
    syllabusX === undefined
      ? undefined
      : [...links].sort(
          (a, b) => Math.abs(a.x - syllabusX) - Math.abs(b.x - syllabusX),
        )[0];
  const candidates = cell("candidates");
  return {
    sl,
    catNo: CAT.exec(cell("cat"))?.[1] ?? null,
    post: cell("post") || null,
    department: cell("dept") || null,
    scope: scopeOf(cell("scope")),
    examOn,
    // "Deleted" is printed across the row, not always under the date.
    dropped:
      !examOn &&
      [...cells.values()].some((items) =>
        /\b(deleted|cancelled|postponed)\b/i.test(text(items)),
      ),
    timeText: time || null,
    confirmFrom: confirmDates[0] ?? null,
    confirmTo: confirmDates[1] ?? null,
    confirmNote: confirmDates.length === 0 && confirm ? confirm : null,
    ticketsFrom: datesIn(cell("tickets"))[0] ?? null,
    mode: cell("mode") || null,
    medium: cell("medium") || null,
    duration: cell("duration") || null,
    candidates: /\d/.test(candidates)
      ? Number(candidates.replace(/\D/g, ""))
      : null,
    syllabusUrl: syllabus?.url ?? null,
  };
}

function readRows(
  page: ProgrammePage,
  columns: Map<Column, number>,
  below: number,
) {
  const items = splitCatItems(
    page.items.filter(
      (i) => i.str.trim() && i.y < below - 2 && !FURNITURE.test(i.str.trim()),
    ),
  );
  const anchors = items
    .filter(
      (i) =>
        /^\d{1,4}$/.test(i.str.trim()) && nearest(columns, center(i)) === "sl",
    )
    .sort((a, b) => b.y - a.y);
  const ys = [...new Set(items.map((i) => i.y))];
  // Exam dates: each one is the first line of its row's exam cell.
  const examDates = items
    .filter((i) => datesIn(i.str).length > 0 && columnOf(columns, i) === "exam")
    .map((i) => i.y);
  /** The break between two anchors, kept above any exam date between them. */
  const dateBetween = (upper: number, lower: number) =>
    Math.max(-Infinity, ...examDates.filter((y) => y < upper && y > lower));
  const split = (upper: number, lower: number) =>
    boundary(upper, lower, ys, dateBetween(upper, lower));
  /**
   * In the exam column itself the date is the first line of the lower row's cell, so
   * the break there is just above it, whatever the other columns do.
   */
  const examSplit = (upper: number, lower: number) => {
    const date = dateBetween(upper, lower);
    return date === -Infinity ? split(upper, lower) : date + 0.5;
  };
  const drafts: Draft[] = [];
  const ranges: (readonly [number, number])[] = [];
  anchors.forEach((anchor, k) => {
    const top = k === 0 ? below : split(anchors[k - 1]!.y, anchor.y);
    const next = anchors[k + 1];
    // The last row on a page is as tall below its middle as above it: anything lower is
    // a footnote, not part of the row.
    const bottom = next
      ? split(anchor.y, next.y)
      : anchor.y - (top - anchor.y) - 4;
    const examTop = k === 0 ? below : examSplit(anchors[k - 1]!.y, anchor.y);
    const examBottom = next ? examSplit(anchor.y, next.y) : bottom;
    const cells = new Map<Column, TextItem[]>();
    for (const item of items) {
      const column = columnOf(columns, item);
      if (column === "sl" || column === "syllabus") continue;
      const [high, low] =
        column === "exam" ? [examTop, examBottom] : [top, bottom];
      if (item.y >= high || item.y <= low) continue;
      cells.set(column, [...(cells.get(column) ?? []), item]);
    }
    for (const cell of cells.values()) ranges.push(...commonRanges(text(cell)));
    drafts.push(
      draftFrom(
        Number(anchor.str.trim()),
        cells,
        page.links.filter((l) => l.y < top && l.y > bottom),
        columns.get("syllabus"),
      ),
    );
  });
  return { drafts, ranges };
}

/** What a merged cell prints once for every row it spans. */
const SHARED = [
  "post",
  "department",
  "examOn",
  "timeText",
  "confirmFrom",
  "confirmTo",
  "confirmNote",
  "ticketsFrom",
  "mode",
  "medium",
  "duration",
  "syllabusUrl",
] as const;
type Shared = (typeof SHARED)[number];

/**
 * Fill each merged cell in for every row it spans: across a "common test for serial
 * numbers 5 to 18" range (the date and the exam's details, not the post), then between
 * rows of the same post (one row per district).
 */
function fillMerged(drafts: Draft[], ranges: (readonly [number, number])[]) {
  const fill = (group: Draft[], keys: readonly Shared[]) => {
    for (const key of keys) {
      const source = group.find((d) => d[key] !== null);
      if (!source) continue;
      for (const d of group)
        if (d[key] === null && !d.dropped)
          (d as Record<Shared, unknown>)[key] = source[key];
    }
  };
  for (const [from, to] of ranges)
    fill(
      drafts.filter((d) => d.sl >= from && d.sl <= to),
      SHARED.filter((k) => k !== "post" && k !== "department"),
    );
  const byCat = new Map<string, Draft[]>();
  for (const d of drafts)
    if (d.catNo) byCat.set(d.catNo, [...(byCat.get(d.catNo) ?? []), d]);
  for (const group of byCat.values()) if (group.length > 1) fill(group, SHARED);
}

const CANCEL = /റദ്|cancel/i;

/** The lines above the first table: what changed, what's cancelled. */
function readNotes(page: ProgrammePage, headerTop: number) {
  const above = page.items.filter((i) => i.y > headerTop + 2);
  return lines(above)
    .map((l) => l.text)
    .filter(
      (l) =>
        l.length > 3 &&
        !/^(kerala public service commission|website:|sheet|examination programme$)/i.test(
          l,
        ) &&
        !/programme for the month of/i.test(l) &&
        !/^\(?(for submitting confirmation|finali[sz]ed after)/i.test(l) &&
        !/^[A-Z]+ \d{4}( \(M\d+\))?$/i.test(l),
    )
    .slice(0, 30);
}

/** Category numbers a note marks as cancelled: each numbered note read on its own. */
function cancelledIn(notes: string[]) {
  const items: string[] = [];
  for (const line of notes)
    if (/^(\d+\.|reason for)/i.test(line) || items.length === 0)
      items.push(line);
    else items[items.length - 1] += ` ${line}`;
  const cancelled = new Set<string>();
  for (const item of items)
    if (CANCEL.test(item))
      for (const [, cat] of item.matchAll(new RegExp(CAT.source, "g")))
        cancelled.add(cat!);
  return [...cancelled];
}

export function readPscProgramme(pages: ProgrammePage[]): ReadProgramme {
  const all = pages.flatMap((p) => p.items.map((i) => clean(i.str)));
  const titleLine =
    all.find((s) => /programme for the month of/i.test(s)) ?? null;
  const titled = /month of ([a-z]+)\s+(\d{4})/i.exec(titleLine ?? "");
  const month = titled ? monthStart(titled[1]!, titled[2]!) : null;
  const joined = all.join(" ");
  const stage: ProgrammeStage = /^modified/i.test(titleLine ?? "")
    ? "MODIFIED"
    : /for submitting confirmation|for confirmation/i.test(joined)
      ? "FOR_CONFIRMATION"
      : /after (the )?(date of )?confirmation/i.test(joined)
        ? "AFTER_CONFIRMATION"
        : "OTHER";

  const drafts: Draft[] = [];
  const ranges: (readonly [number, number])[] = [];
  const problems: string[] = [];
  let notes: string[] = [];
  let columns: Map<Column, number> | null = null;
  pages.forEach((page, i) => {
    const header = findHeader(page);
    if (header) {
      if (!columns) notes = readNotes(page, header.top);
      columns = header.columns;
    }
    if (!columns) return;
    for (const needed of ["sl", "post", "exam"] as const)
      if (!columns.has(needed)) {
        problems.push(`Page ${i + 1}: no "${needed}" column in the header.`);
        return;
      }
    const read = readRows(page, columns, header?.bottom ?? Infinity);
    drafts.push(...read.drafts);
    ranges.push(...read.ranges);
  });
  fillMerged(drafts, ranges);

  const rows: ProgrammeRow[] = [];
  const dropped = new Set<string>();
  for (const { dropped: gone, ...d } of drafts) {
    const label = d.catNo ? `Row ${d.sl} (Cat. No. ${d.catNo})` : `Row ${d.sl}`;
    if (gone) {
      if (d.catNo) dropped.add(d.catNo);
      else problems.push(`${label}: marked deleted, with no category number.`);
    } else if (!d.examOn) problems.push(`${label}: no exam date found.`);
    else if (!d.post) problems.push(`${label}: no post name found.`);
    else rows.push({ ...d, examOn: d.examOn, post: d.post });
  }
  if (!columns) problems.push("No table header (Sl. No., Name of Post) found.");
  else if (rows.length === 0) problems.push("The table had no rows.");
  if (!month) problems.push("The month it covers wasn't in its title.");

  return {
    title: titleLine
      ? clean(titleLine)
      : "Examination programme (no title found)",
    month,
    stage,
    notes,
    cancelled: [...new Set([...cancelledIn(notes), ...dropped])],
    rows,
    problems,
  };
}
