// Splits syllabus text by its own headings before any AI call. Small models drop content
// when handed a whole page; one focused section at a time they don't. Headings and marks
// found here are trusted over the model's, because they come straight from the text.
//
// Shaped on real Kerala PSC notifications:
//   Distribution of Marks ... Detailed Syllabus     the marks table is skipped
//   I. GENERAL KNOWLEDGE  /  Part I  /  ഭാഗം 1        a part
//   (i) HISTORY (5 Marks)  /  ii) GEOGRAPHY  /  A. ...  a section, with its own marks
//   Part I (1) ചരിത്രം (5 Marks)                       a part and its section on one line
//   1) Kerala - Arrival of Europeans - ...          content: numbered lines are topics

export type Section = {
  /** "Part I General knowledge", or null when the syllabus has no parts. */
  part: string | null;
  /** Marks for this section: its own when stated, else its part's. */
  partMarks: number | null;
  /** Sections sharing marks share a group; a section with its own marks has its own. */
  group: string | null;
  /** The section heading ("History"), used as the subject name. */
  heading: string | null;
  body: string;
};

// English and Malayalam: ഭാഗം = part, വിഭാഗം = section, പേപ്പർ = paper, മൊഡ്യൂൾ = module,
// മാർക്ക് = marks. Malayalam words end in non-word characters for \b, so ends are explicit.
const PART_WORD =
  /^(part|paper|module|unit|ഭാഗം|വിഭാഗം|പേപ്പർ|മൊഡ്യൂൾ)\s*[-–:]?\s*([ivxlc]+|\d{1,2}|[a-e])(?![a-z0-9])[.:)\-–\s]*(.*)$/i;
/** "I. GENERAL KNOWLEDGE": a capital Roman numeral and a dot. Case-sensitive on purpose. */
const PART_ROMAN = /^([IVX]{1,5})\.\s+(\S.*)$/;
/** "(i) HISTORY", "ii) GEOGRAPHY", "(i). Simple Arithmetic", "i. English", "ii Vocabulary". */
const SECTION_ROMAN = /^\(?([ivx]{1,5})(?:\)\.?|\.|\s)\s*(\S.*)$/;
/** "(1) ചരിത്രം", "A. Simple Arithmetic", "B. Mental Ability". */
const SECTION_OTHER = /^(?:\((\d{1,2})\)|([A-H])\.)\s*(\S.*)$/;
/** "1. History", "2) Geography": topics in real notifications, headings in some others. */
const NUMBERED = /^(\d{1,2})\s*[.)]\s+(.+)$/;

const MARK_WORD = String.raw`(?:m\s?a\s?r\s?k\s?s?(?![a-z])|മാർക്ക്)`;
const MARKS = new RegExp(
  String.raw`\(?\s*(?:total\s+)?${MARK_WORD}\s*[:\-–]?\s*(\d{1,4})\s*\)?|\(\s*(\d{1,4})\s*${MARK_WORD}\s*\)|(\d{1,4})\s*${MARK_WORD}`,
  "i",
);
const TABLE_START =
  /distribution of marks|marks distribution|scheme of (?:the )?exam/i;
const TABLE_END = /detailed syllabus/i;

export function marksIn(line: string): number | null {
  const m = MARKS.exec(line);
  const value = m ? Number(m[1] ?? m[2] ?? m[3]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "INDIAN CONSTITUTION" -> "Indian constitution" (sentence case, per the copy rules). */
function sentenceCase(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || letters !== letters.toUpperCase()) return text;
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Heading text without marks, labels or trailing punctuation. */
function clean(text: string) {
  return sentenceCase(
    text
      .replace(MARKS, "")
      .replace(/\(\s*\)/g, "")
      .replace(/[\s:.\-–,]+$/g, "")
      .replace(/^[\s:.\-–]+/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** A title, not a list of topics: short, at most one dash, not cut off mid-list. */
function titleLike(text: string) {
  const title = clean(text);
  if (!title || title.split(/\s+/).length > 10) return false;
  // "(v) Kerala Governance and System of Administration – (10 Marks)": stated marks make
  // it a heading whatever punctuation sits before them.
  if (marksIn(text)) return true;
  if ((text.match(/\s[-–]\s|[-–]\s*[-–]/g) ?? []).length >= 2) return false;
  return !/[-–,]\s*$/.test(text.replace(MARKS, "").trim());
}

type Heading =
  | {
      kind: "part";
      label: string;
      title: string;
      marks: number | null;
      inline: string | null;
    }
  | { kind: "section"; title: string; label: string; marks: number | null };

function partHeading(line: string): Heading | null {
  if (line.length > 140) return null;
  const word = PART_WORD.exec(line);
  if (word) {
    const label = `${word[1][0].toUpperCase()}${word[1].slice(1).toLowerCase()} ${word[2].toUpperCase()}`;
    const rest = word[3];
    // "Part I (1) ചരിത്രം (5 Marks)": the rest is the part's first section.
    const inline =
      SECTION_OTHER.exec(rest) || SECTION_ROMAN.exec(rest) ? rest : null;
    return {
      kind: "part",
      label,
      title: inline ? "" : clean(rest),
      marks: inline ? null : marksIn(line),
      inline,
    };
  }
  const roman = PART_ROMAN.exec(line);
  if (roman && titleLike(roman[2]))
    return {
      kind: "part",
      label: roman[1],
      title: clean(roman[2]),
      marks: marksIn(line),
      inline: null,
    };
  return null;
}

function sectionHeading(
  line: string,
  digitsAreHeadings: boolean,
  next?: string,
): Heading | null {
  if (line.length > 120) return null;
  const roman = SECTION_ROMAN.exec(line);
  const other = SECTION_OTHER.exec(line);
  let numbered = digitsAreHeadings ? NUMBERED.exec(line) : null;
  // "1. Fractions, decimals, percentage" followed by "2. ..." is a numbered topic list;
  // "6. Arts, literature, culture, sports" followed by its text is a heading.
  // Plain numbering is the weakest signal: short, and with text of its own to follow.
  if (
    numbered &&
    ((numbered[2].includes(",") && NUMBERED.test(next ?? "")) ||
      !next ||
      numbered[2].trim().split(/\s+/).length > 6)
  )
    numbered = null;
  const rest = roman?.[2] ?? other?.[3] ?? numbered?.[2];
  const label = roman?.[1] ?? other?.[1] ?? other?.[2] ?? numbered?.[1] ?? "";
  // "ii Vocabulary" has no punctuation, so it needs a capital letter after the numeral.
  if (roman && /^[ivx]+\s/.test(line) && !/^[A-Z]/.test(roman[2])) return null;
  if (rest === undefined) return null;
  // "Part I (3) (5 Marks)": a section whose title didn't survive the PDF still counts.
  if (!clean(rest) && marksIn(rest))
    return { kind: "section", title: "", label, marks: marksIn(line) };
  if (!titleLike(rest)) return null;
  return { kind: "section", title: clean(rest), label, marks: marksIn(line) };
}

/** Some notifications number their sections "1. History"; real PSC ones number topics so. */
function digitsAreHeadings(lines: string[]) {
  return !lines.some(
    (l) =>
      (SECTION_ROMAN.test(l) && /^\(|^[ivx]+[.)]/.test(l)) ||
      SECTION_OTHER.test(l),
  );
}

/** "( 1 0 M a r k s )" -> "( 10Marks )": some PDFs space out every character. */
function despace(line: string) {
  return line.replace(/(?<!\S)((?:\S ){2,}\S)(?!\S)/g, (run) =>
    run.replace(/ /g, ""),
  );
}

export function splitSections(text: string): Section[] {
  let lines = text
    .split("\n")
    .map((l) => despace(l.trim()))
    .filter(Boolean);
  // Skip the marks table: its rows look like headings ("i. History 5") but hold no topics.
  const start = lines.findIndex((l) => TABLE_START.test(l));
  const end =
    start >= 0 ? lines.findIndex((l, i) => i > start && TABLE_END.test(l)) : -1;
  if (start >= 0 && end > start)
    lines = [...lines.slice(0, start), ...lines.slice(end + 1)];

  const digits = digitsAreHeadings(lines);
  const sections: Section[] = [];
  let part: string | null = null;
  let partMarks: number | null = null;
  let current: Section | null = null;
  let sawHeading = false;

  const flush = () => {
    if (current && (current.body.trim() || current.heading))
      sections.push(current);
    current = null;
  };
  const openSection = (h: Extract<Heading, { kind: "section" }>) => {
    // A part followed straight by sections is only a container.
    if (
      current &&
      !current.body.trim() &&
      current.heading &&
      current.group === part
    )
      current = null;
    flush();
    const title = h.title || `${part ?? "Section"} (${h.label})`;
    current = {
      part,
      partMarks: h.marks ?? partMarks,
      group: h.marks ? `${part ?? ""}|${title}` : part,
      heading: title,
      body: "",
    };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const p = partHeading(line);
    if (p?.kind === "part") {
      flush();
      sawHeading = true;
      let title = p.title;
      let marks = p.marks;
      // "Part III" with its title on the next line.
      if (
        !title &&
        !p.inline &&
        lines[i + 1] &&
        titleLike(lines[i + 1]) &&
        !sectionHeading(lines[i + 1], digits)
      ) {
        title = clean(lines[++i]);
        marks = marksIn(lines[i]);
      }
      part = title ? `${p.label} ${title}` : p.label;
      partMarks = marks;
      current = {
        part,
        partMarks,
        group: part,
        heading: title || null,
        body: "",
      };
      if (p.inline) {
        const s = sectionHeading(p.inline, true);
        if (s?.kind === "section") openSection(s);
      }
      continue;
    }
    const s = sectionHeading(line, digits, lines[i + 1]);
    if (s?.kind === "section") {
      sawHeading = true;
      openSection(s);
      continue;
    }
    if (!current)
      current = { part, partMarks, group: part, heading: null, body: "" };
    current.body += `${line}\n`;
  }
  flush();

  // No structure found: one section, so the caller falls back to plain chunks.
  if (!sawHeading)
    return [
      { part: null, partMarks: null, group: null, heading: null, body: text },
    ];
  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}
