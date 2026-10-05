import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./csrf";

const app = "http://localhost:3000";
const req = (method: string, headers: Record<string, string>) =>
  new Request("http://localhost:3000/api/x", { method, headers });

describe("isSameOrigin", () => {
  it("lets safe methods through", () => {
    expect(
      isSameOrigin(req("GET", { origin: "https://evil.example" }), app),
    ).toBe(true);
  });

  it("accepts same-origin posts", () => {
    expect(
      isSameOrigin(
        req("POST", { origin: app, "sec-fetch-site": "same-origin" }),
        app,
      ),
    ).toBe(true);
  });

  it("rejects cross-site posts", () => {
    expect(
      isSameOrigin(req("POST", { origin: "https://evil.example" }), app),
    ).toBe(false);
    expect(
      isSameOrigin(req("POST", { "sec-fetch-site": "cross-site" }), app),
    ).toBe(false);
  });

  it("rejects posts with no origin information", () => {
    expect(isSameOrigin(req("POST", {}), app)).toBe(false);
  });
});
