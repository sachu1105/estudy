import { z } from "zod";

import { editableTreeSchema } from "@/lib/syllabus/tree";

export const titleSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Give the syllabus a title.")
      .max(120, "Keep the title under 120 characters."),
  );

const examId = z.uuid().nullable().default(null);

export const uploadCompleteSchema = z.object({
  key: z.string().min(1).max(200),
  title: titleSchema,
  examId,
  sourceName: z.string().max(255).nullable().default(null),
});

export const pasteTextSchema = z.object({
  title: titleSchema,
  examId,
  text: z
    .string()
    .min(40, "Paste the whole syllabus: subjects and the topics under them.")
    .max(200_000, "That's more text than a syllabus usually has."),
});

export const treeActionSchema = z.object({
  versionId: z.uuid(),
  tree: editableTreeSchema,
});

export const versionActionSchema = z.object({ versionId: z.uuid() });

export type ActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };
