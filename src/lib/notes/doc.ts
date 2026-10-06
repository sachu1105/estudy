import { z } from "zod";

// A note is a Tiptap (ProseMirror) JSON document. Pure helpers, shared by the server
// (validate, clean, index) and the editor.

export type DocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: DocNode[];
};

const nodeSchema: z.ZodType<DocNode> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    text: z.string().max(100_000).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z.object({
          type: z.string().max(40),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .max(20)
      .optional(),
    content: z.array(nodeSchema).max(5000).optional(),
  }),
);

export const noteDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(nodeSchema).max(5000).optional(),
  })
  .refine(
    (doc) => JSON.stringify(doc).length <= 500_000,
    "This note is too long to save.",
  );

export const emptyDoc = (): DocNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

/** Images only from the user's own pod files; links only to http, https or mailto. */
const SAFE_IMAGE = /^\/api\/pods\/files\/[0-9a-f-]{36}$/;
const SAFE_LINK = /^(https?:|mailto:)/i;

export function cleanDoc(node: DocNode): DocNode | null {
  if (node.type === "image") {
    const src = String(node.attrs?.src ?? "");
    if (!SAFE_IMAGE.test(src)) return null;
    return {
      type: "image",
      attrs: { src, alt: String(node.attrs?.alt ?? "").slice(0, 200) },
    };
  }
  const marks = node.marks?.filter(
    (m) => m.type !== "link" || SAFE_LINK.test(String(m.attrs?.href ?? "")),
  );
  const content = node.content
    ?.map(cleanDoc)
    .filter((n): n is DocNode => n !== null);
  return {
    ...node,
    ...(marks ? { marks } : {}),
    ...(content ? { content } : {}),
  };
}

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "listItem",
  "taskItem",
  "tableRow",
  "codeBlock",
  "blockquote",
]);

/** The note's words, one block per line: for search and, later, for mock tests. */
export function docText(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  const inner = (node.content ?? [])
    .map(docText)
    .join(node.type === "tableRow" ? " | " : "");
  return BLOCKS.has(node.type) ? `${inner}\n` : inner;
}

/** File ids of the images placed in a note. */
export function docImageIds(node: DocNode): string[] {
  const own =
    node.type === "image" && typeof node.attrs?.src === "string"
      ? [node.attrs.src.split("/").pop()!]
      : [];
  return [...own, ...(node.content ?? []).flatMap(docImageIds)];
}
