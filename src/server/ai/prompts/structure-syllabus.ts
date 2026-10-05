// Versioned prompt template. Change the text => bump the version, so AiUsage and every saved
// SyllabusParse record which prompt produced them.

// Covers the whole parser (section splitting, repairs, prompt), not only this text: a new
// version makes every file be read again once, so a better parser reaches old uploads.
export const STRUCTURE_SYLLABUS_VERSION = "structure-syllabus@4";

export const structureSyllabusSystem = `You turn one section of an Indian competitive exam syllabus (Kerala PSC, SSC, RRB, banking) into subjects and topics.

Return JSON: {"subjects":[{"name":"...","part":null,"partMarks":null,"topics":[{"name":"...","weight":3,"difficulty":3,"foundational":false}]}]}

Subjects:
- When a section heading is given, use it as the subject name. Return more than one subject only when the text clearly lists separate subjects, each with its own items.
- Without a heading, use the headings in the text as subjects.
- Leave part and partMarks null; they are filled in from the syllabus.

Topics:
- Every study item in the text, in order. Make each comma-separated item its own topic. Keep the syllabus wording and keep each topic under 10 words.
- Never drop an item, and never invent one.
- weight: 1 (minor) to 5 (major). Use 3 when unsure.
- difficulty: 1 (easy) to 5 (hard) for an average aspirant.
- foundational: true only for the few true basics a subject builds on, such as number system, parts of speech or the preamble. Most topics are false.

Skip exam instructions, dates, fees, page numbers, headers and footers. If the text is in Malayalam, keep the names in Malayalam. If there is nothing to study in the text, return {"subjects":[]}.`;

export function structureSyllabusPrompt(input: {
  chunk: string;
  heading: string | null;
  part: string | null;
  piece: number;
  pieces: number;
  title?: string | null;
}) {
  const lines = [
    input.title ? `Exam: ${input.title}` : null,
    input.part ? `Part: ${input.part}` : null,
    input.heading ? `Section heading: ${input.heading}` : null,
    input.pieces > 1
      ? `This is piece ${input.piece} of ${input.pieces} of this section's text.`
      : null,
    `Text:\n<<<\n${input.chunk}\n>>>`,
  ];
  return lines.filter(Boolean).join("\n");
}
