import { describe, expect, it } from "vitest";

import {
  mentionedIn,
  parseInline,
  parseMarkdown,
  plainText,
  safeHref,
} from "./markdown";

const anu = { id: "11111111-1111-4111-8111-111111111111", name: "Anu Mol" };

describe("markdown subset", () => {
  it("parses bold, italic, code and links", () => {
    expect(parseInline("a **b** *c* _d_ `e`")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " " },
      { type: "em", children: [{ type: "text", text: "c" }] },
      { type: "text", text: " " },
      { type: "em", children: [{ type: "text", text: "d" }] },
      { type: "text", text: " " },
      { type: "code", text: "e" },
    ]);
    expect(
      parseInline("see [docs](https://ex.com/a) or https://ex.com/b."),
    ).toEqual([
      { type: "text", text: "see " },
      { type: "link", href: "https://ex.com/a", text: "docs" },
      { type: "text", text: " or " },
      { type: "link", href: "https://ex.com/b", text: "https://ex.com/b" },
      { type: "text", text: "." },
    ]);
  });

  it("never makes HTML or unsafe links", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      { type: "text", text: "<script>alert(1)</script>" },
    ]);
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { type: "text", text: "[x](javascript:alert(1))" },
    ]);
    expect(safeHref("data:text/html,hi")).toBeNull();
    expect(safeHref("https://ex.com")).toBe("https://ex.com/");
  });

  it("keeps snake_case words as text", () => {
    expect(parseInline("snake_case_word")).toEqual([
      { type: "text", text: "snake_case_word" },
    ]);
  });

  it("finds mentions of known people only", () => {
    expect(parseInline("hi @Anu Mol and @Binu", [anu])).toEqual([
      { type: "text", text: "hi " },
      { type: "mention", id: anu.id, name: "Anu Mol" },
      { type: "text", text: " and @Binu" },
    ]);
    expect(mentionedIn("thanks @Anu Mol!", [anu])).toEqual([anu]);
    expect(mentionedIn("thanks Anu", [anu])).toEqual([]);
  });

  it("parses blocks: lists, quotes, code and line breaks", () => {
    const blocks = parseMarkdown(
      "Intro\nline two\n\n- one\n- two\n\n1. first\n\n> quoted\n\n```\n**raw**\n```",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "p",
      "ul",
      "ol",
      "quote",
      "pre",
    ]);
    expect(blocks[0]).toEqual({
      type: "p",
      children: [
        { type: "text", text: "Intro" },
        { type: "br" },
        { type: "text", text: "line two" },
      ],
    });
    expect(blocks[4]).toEqual({ type: "pre", text: "**raw**" });
  });

  it("makes plain previews", () => {
    expect(plainText("**Hi** [link](https://x.y)\n\n> q", 40)).toBe(
      "Hi link q",
    );
    expect(plainText("a".repeat(10), 5)).toBe("aaaa…");
  });
});
