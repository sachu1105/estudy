import { describe, expect, it } from "vitest";

import {
  handleSchema,
  profileSchema,
  profileUrl,
  suggestHandle,
} from "./profile";

describe("handleSchema", () => {
  it("accepts plain handles and lowercases them", () => {
    expect(handleSchema.parse(" Anjali_N ")).toBe("anjali_n");
    expect(handleSchema.parse("ldc2026")).toBe("ldc2026");
  });

  it("rejects handles that would not survive a URL", () => {
    for (const bad of [
      "ab",
      "a".repeat(25),
      "_anjali",
      "anjali_",
      "an jali",
      "anjali!",
    ])
      expect(handleSchema.safeParse(bad).success, bad).toBe(false);
  });

  it("keeps our own routes and the obvious impersonations", () => {
    for (const taken of ["settings", "admin", "studypods", "u"])
      expect(handleSchema.safeParse(taken).success, taken).toBe(false);
  });
});

describe("profileSchema", () => {
  it("trims, and an empty bio becomes null", () => {
    expect(
      profileSchema.parse({ displayName: " Anjali ", bio: "   " }),
    ).toEqual({
      displayName: "Anjali",
      bio: null,
    });
  });

  it("needs a display name and caps the bio", () => {
    expect(
      profileSchema.safeParse({ displayName: "  ", bio: null }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ displayName: "Anjali", bio: "x".repeat(161) })
        .success,
    ).toBe(false);
  });
});

describe("suggestHandle", () => {
  it("folds a name down to a usable handle", () => {
    expect(suggestHandle("Anjali N", "7f3a")).toBe("anjali_n");
    expect(suggestHandle("Fathima  S.", "7f3a")).toBe("fathima_s");
  });

  it("falls back when the name gives too little to work with", () => {
    expect(suggestHandle("A", "7f3a")).toBe("study_7f3a");
    expect(suggestHandle("!!!", "7f3a")).toBe("study_7f3a");
  });

  it("always suggests something the schema accepts", () => {
    for (const name of ["Anjali N", "A", "!!!", "x".repeat(60), "Ravi-Kumar"])
      expect(
        handleSchema.safeParse(suggestHandle(name, "7f3a")).success,
        name,
      ).toBe(true);
  });
});

describe("profileUrl", () => {
  it("joins the origin and the handle without a double slash", () => {
    expect(profileUrl("https://studypods.app/", "anjali_n")).toBe(
      "https://studypods.app/u/anjali_n",
    );
  });
});
