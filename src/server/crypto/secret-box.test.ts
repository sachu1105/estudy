import { describe, expect, it } from "vitest";

import { hintOf, open, seal } from "./secret-box";

const master = "a-master-secret-of-at-least-32-characters!";

describe("secret box", () => {
  it("round-trips, and never stores the secret in the clear", () => {
    const sealed = seal("sk-ant-api03-secret-value", master);
    expect(sealed).not.toContain("secret-value");
    expect(open(sealed, master)).toBe("sk-ant-api03-secret-value");
  });

  it("seals the same secret differently every time", () => {
    expect(seal("same", master)).not.toBe(seal("same", master));
  });

  it("refuses another master key and tampered text", () => {
    const sealed = seal("sk-secret", master);
    expect(open(sealed, `${master}x`)).toBeNull();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("other").toString("base64url");
    expect(open(parts.join("."), master)).toBeNull();
    expect(open("garbage", master)).toBeNull();
  });

  it("hints with the last four characters only", () => {
    expect(hintOf("sk-ant-api03-abcd1234")).toBe("…1234");
  });
});
