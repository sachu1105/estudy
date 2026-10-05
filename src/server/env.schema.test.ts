import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { describe, expect, it } from "vitest";

import { parseEnv } from "./env.schema";

const example = parse(readFileSync(".env.example", "utf8"));

describe("env schema", () => {
  it("accepts .env.example as-is", () => {
    const env = parseEnv(example);
    expect(env.BILLING_ENABLED).toBe(false);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.AI_API_KEY).toBeUndefined();
  });

  it("fails on a missing variable and names it", () => {
    const rest = { ...example };
    delete rest.DATABASE_URL;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("requires a key and model for the hosted AI provider", () => {
    expect(() => parseEnv({ ...example, AI_PROVIDER: "hosted" })).toThrow(
      /AI_API_KEY/,
    );
    expect(
      parseEnv({
        ...example,
        AI_PROVIDER: "hosted",
        AI_API_KEY: "k",
        AI_MODEL: "m",
      }).AI_PROVIDER,
    ).toBe("hosted");
  });

  it("rejects short or identical JWT secrets", () => {
    expect(() => parseEnv({ ...example, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
    expect(() =>
      parseEnv({ ...example, JWT_REFRESH_SECRET: example.JWT_ACCESS_SECRET }),
    ).toThrow(/must differ/);
  });

  it("never defines a NEXT_PUBLIC_ variable (rule 1)", () => {
    expect(
      Object.keys(example).filter((key) => key.startsWith("NEXT_PUBLIC_")),
    ).toEqual([]);
  });
});
