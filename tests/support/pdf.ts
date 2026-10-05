/**
 * A minimal, valid one-page PDF with the given lines of text (Helvetica), so tests can
 * exercise real PDF extraction without a fixture file.
 */
export function makePdf(lines: string[]): Uint8Array {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const stream = [
    "BT /F1 12 Tf 50 780 Td 16 TL",
    ...lines.map((line) => `(${escape(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

/** A short syllabus in the shape Kerala PSC notifications use. */
export const sampleSyllabus = [
  "Kerala PSC LD Clerk - Detailed syllabus",
  "Part I: General Knowledge (50 marks)",
  "History: Kerala renaissance, freedom struggle, social reformers",
  "Geography: Rivers of Kerala, climate, soils",
  "Part II: Simple Arithmetic and Mental Ability (20 marks)",
  "Number system, fractions, percentage, ratio and proportion",
  "Part III: General English (10 marks)",
  "Parts of speech, tenses, synonyms and antonyms",
];
