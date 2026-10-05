import { describe, expect, it } from "vitest";

import { isId, newId, sequentialIds } from "./ids";

describe("ids", () => {
  it("generates valid, unique uuids", () => {
    const a = newId();
    const b = newId();
    expect(isId(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("sequential ids are valid and deterministic", () => {
    const first = sequentialIds();
    const second = sequentialIds();
    const ids = [first.next(), first.next()];
    expect(ids).toEqual([second.next(), second.next()]);
    expect(ids[0]).toBe("00000000-0000-4000-8000-000000000001");
    expect(ids.every(isId)).toBe(true);
  });

  it("rejects non-uuids", () => {
    expect(isId("abc")).toBe(false);
    expect(isId(42)).toBe(false);
  });
});
