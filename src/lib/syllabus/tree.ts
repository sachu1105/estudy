import { z } from "zod";

// The subject -> topic tree as the review screen edits it and the server saves it. Pure, so
// the browser and the server validate with the same rules.

export const LIMITS = { subjects: 40, topicsPerSubject: 300, name: 200 };

const name = (label: string) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, `Give every ${label} a name.`)
        .max(
          LIMITS.name,
          `Keep ${label} names under ${LIMITS.name} characters.`,
        ),
    );

const level = z.number().int().min(1).max(5);

export const editableTopicSchema = z.object({
  id: z.uuid(),
  name: name("topic"),
  weight: level,
  difficulty: level,
  foundational: z.boolean(),
});

export const editableSubjectSchema = z.object({
  id: z.uuid(),
  name: name("subject"),
  topics: z
    .array(editableTopicSchema)
    .min(1, "Every subject needs at least one topic.")
    .max(LIMITS.topicsPerSubject),
});

export const editableTreeSchema = z
  .object({
    subjects: z
      .array(editableSubjectSchema)
      .min(1, "Add at least one subject.")
      .max(
        LIMITS.subjects,
        `A syllabus can have up to ${LIMITS.subjects} subjects.`,
      ),
  })
  .superRefine((tree, ctx) => {
    const ids = tree.subjects.flatMap((s) => [
      s.id,
      ...s.topics.map((t) => t.id),
    ]);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate ids in the tree." });
  });

export type EditableTopic = z.output<typeof editableTopicSchema>;
export type EditableSubject = z.output<typeof editableSubjectSchema>;
export type EditableTree = z.output<typeof editableTreeSchema>;
