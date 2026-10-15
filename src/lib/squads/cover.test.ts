import { describe, expect, it } from "vitest";

import { coverFor } from "@/lib/pods/covers";

import { squadCover } from "./cover";

const id = "4f1d2c3b-5a6e-4f80-9a1b-2c3d4e5f6071";

describe("squadCover", () => {
  it("falls back to the squad's own automatic gradient", () => {
    expect(squadCover({ id })).toEqual(coverFor(id));
    expect(squadCover({ id, cover: null })).toEqual(coverFor(id));
    // Anything unreadable in the column falls back too, rather than throwing.
    expect(squadCover({ id, cover: { kind: "nonsense" } })).toEqual(
      coverFor(id),
    );
  });

  it("uses a chosen gradient", () => {
    expect(
      squadCover({ id, cover: { kind: "gradient", preset: "ocean" } }),
    ).toEqual({
      kind: "gradient",
      preset: "ocean",
    });
  });

  it("serves an uploaded banner through the route, versioned by its key", () => {
    const key = `squad/${id}/abcdef0123456789`;
    expect(
      squadCover({ id, cover: { kind: "image", key, mime: "image/png" } }),
    ).toEqual({ kind: "image", url: `/api/squad-image/${id}?v=23456789` });
  });
});
