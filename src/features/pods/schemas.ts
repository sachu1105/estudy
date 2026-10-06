import { z } from "zod";

export const podNameSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Give the pod a name.")
      .max(80, "Keep the name under 80 characters."),
  );

export const topicDoneSchema = z.object({
  podId: z.uuid(),
  topicId: z.uuid(),
  done: z.boolean(),
});

export const podIdSchema = z.object({ podId: z.uuid() });
export const newPodSchema = z.object({ name: podNameSchema });
export const renamePodSchema = z.object({
  podId: z.uuid(),
  name: podNameSchema,
});
const column = z.array(z.uuid()).max(100);
export const arrangeBoardSchema = z.object({
  syllabusId: z.uuid(),
  board: z.object({
    TO_STUDY: column,
    STUDYING: column,
    REVISING: column,
    DONE: column,
  }),
});
export const adoptSyllabusSchema = z.object({ versionId: z.uuid() });

export type ActionResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };

const itemTitle = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Give it a title.")
      .max(120, "Keep the title under 120 characters."),
  );

export const addNoteSchema = z.object({
  podId: z.uuid(),
  title: itemTitle.default("Untitled note"),
  topicIds: z.array(z.uuid()).max(300).default([]),
});

export const addLinkSchema = z.object({
  podId: z.uuid(),
  url: z
    .string()
    .trim()
    .min(4, "Paste a link.")
    .max(2000)
    .transform((u) => (/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`)),
  topicIds: z.array(z.uuid()).max(300).default([]),
});

export const saveNoteSchema = z.object({
  itemId: z.uuid(),
  title: itemTitle,
  doc: z.unknown(),
});

export const renameItemSchema = z.object({
  itemId: z.uuid(),
  title: itemTitle,
});
export const itemTopicsSchema = z.object({
  itemId: z.uuid(),
  topicIds: z.array(z.uuid()).max(300),
});
export const itemIdSchema = z.object({ itemId: z.uuid() });
