import { describe, expect, it } from "vitest";

import {
  cleanDoc,
  docImageIds,
  docText,
  noteDocSchema,
  type DocNode,
} from "./doc";

const FILE = "/api/pods/files/00000000-0000-4000-8000-000000000001";

const doc: DocNode = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Rivers" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Periyar is the " },
        { type: "text", text: "longest", marks: [{ type: "bold" }] },
        {
          type: "text",
          text: " river",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        },
      ],
    },
    { type: "image", attrs: { src: FILE, alt: "Map" } },
    { type: "image", attrs: { src: "https://tracker.example/pixel.gif" } },
  ],
};

describe("note documents", () => {
  it("accepts a Tiptap document and rejects anything else", () => {
    expect(noteDocSchema.safeParse(doc).success).toBe(true);
    expect(noteDocSchema.safeParse({ type: "paragraph" }).success).toBe(false);
  });

  it("drops images from outside the user's pods and unsafe links", () => {
    const cleaned = cleanDoc(doc)!;
    expect(cleaned.content!.filter((n) => n.type === "image")).toEqual([
      { type: "image", attrs: { src: FILE, alt: "Map" } },
    ]);
    expect(cleaned.content![1].content![2].marks).toEqual([]);
  });

  it("indexes the words, one block per line, and lists the images", () => {
    expect(docText(doc)).toBe("Rivers\nPeriyar is the longest river\n");
    expect(docImageIds(cleanDoc(doc)!)).toEqual([
      "00000000-0000-4000-8000-000000000001",
    ]);
  });
});
