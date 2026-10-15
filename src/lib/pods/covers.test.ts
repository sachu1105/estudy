import { describe, expect, it } from "vitest";

import {
  COVER_PRESETS,
  coverFor,
  initialsOf,
  meshBackground,
  parseStoredCover,
} from "./covers";

describe("pod covers", () => {
  it("gives the same pod the same cover every time", () => {
    const id = "075b02f3-68f3-4fb4-b5a2-c4471dbdb40f";
    expect(coverFor(id)).toEqual(coverFor(id));
  });

  it("spreads pods over the presets", () => {
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => {
        const cover = coverFor(`pod-${i}`);
        return cover.kind === "gradient" ? cover.preset : null;
      }),
    );
    expect(seen.size).toBe(Object.keys(COVER_PRESETS).length);
  });

  it("draws three blobs over the base colour", () => {
    const css = meshBackground("meadow");
    expect(css.match(/radial-gradient/g)).toHaveLength(3);
    expect(css.endsWith(COVER_PRESETS.meadow.base)).toBe(true);
  });

  it("reads saved covers and drops anything it doesn't know", () => {
    expect(parseStoredCover({ kind: "gradient", preset: "ember" })).toEqual({
      kind: "gradient",
      preset: "ember",
    });
    expect(parseStoredCover({ kind: "gradient", preset: "neon" })).toBeNull();
    expect(
      parseStoredCover({ kind: "image", key: "covers/u/1", mime: "image/gif" }),
    ).toBeNull();
    expect(parseStoredCover(null)).toBeNull();
  });

  it("marks a pod with up to two initials, skipping small words", () => {
    expect(initialsOf("Current Affairs")).toBe("CA");
    expect(initialsOf("Economics")).toBe("E");
    expect(initialsOf("Mental Ability & Reasoning")).toBe("MA");
    expect(initialsOf("Basics of Computer")).toBe("BC");
    expect(initialsOf("  ")).toBe("");
  });
});
