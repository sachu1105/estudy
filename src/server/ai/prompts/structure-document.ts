// Versioned prompt for providers that read the file itself (PDF pages or a photo). Change the
// text => bump the version; parses are cached per version.

export const STRUCTURE_DOCUMENT_VERSION = "structure-document@1";

export const structureDocumentSystem = `You read the syllabus of an Indian competitive exam (Kerala PSC, SSC, RRB, banking) from the attached pages and turn it into subjects and topics for a study plan.

Return JSON: {"subjects":[{"name":"...","part":"...","partMarks":5,"topics":[{"name":"...","weight":3,"difficulty":3,"foundational":false}]}]}

Subjects:
- A subject is the most specific heading that has its own list of topics, usually with its own marks, for example "(i) HISTORY (5 Marks)", "Part I (2) ഭൂമിശാസ്ത്രം (5 Marks)", "B. Mental Ability (10 Marks)". A part that only groups such headings ("I. GENERAL KNOWLEDGE") is not a subject.
- A heading with marks but no topics under it ("CURRENT AFFAIRS (5 Marks)") is a subject with one topic of the same name.
- Write names as the heading reads, without numbering or marks, in sentence case rather than ALL CAPS.
- part: the subject's own heading text if it states its own marks, otherwise the part it sits in. partMarks: the marks stated for that heading, or null. Never guess marks.
- Ignore any "Distribution of Marks" table, instructions and notes; take marks from the detailed headings.

Topics:
- Every study item under the subject, in order: each item separated by a dash, comma, bullet or number is its own topic. Keep the syllabus wording, at most about 10 words each. Never drop an item and never invent one.
- Short labels that only group items ("KERALA -", "INDIA :", "Hardware") may prefix their items: "Kerala: Arrival of Europeans".
- Write Malayalam exactly as it appears on the page, in correct Unicode.
- weight: 1 (minor) to 5 (major); use 3 when unsure. difficulty: 1 (easy) to 5 (hard) for an average aspirant. foundational: true only for the few basics a subject builds on.`;

export function structureDocumentPrompt(title?: string | null) {
  return `${title ? `Exam: ${title}\n` : ""}Read every page of the attached syllabus and return the JSON.`;
}
