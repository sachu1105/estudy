import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { generatePlan } from "./generate";
import { replan } from "./replan";
import { assertPlanInvariants } from "./testing";

// Golden files: fixtures/plan-engine/<name>.input.json -> <name>.expected.json.
// Regenerate with `pnpm fixtures:plan` only when an output change is intended.

const DIR = join(process.cwd(), "fixtures/plan-engine");
const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".input.json"))
  .map((f) => f.replace(".input.json", ""))
  .sort();

describe("plan engine fixtures", () => {
  it("has at least 20 fixture pairs", () => {
    expect(names.length).toBeGreaterThanOrEqual(20);
  });

  for (const name of names) {
    it(name, () => {
      const fixture = JSON.parse(
        readFileSync(join(DIR, `${name}.input.json`), "utf8"),
      );
      const expected = readFileSync(join(DIR, `${name}.expected.json`), "utf8");
      const output =
        fixture.fn === "replan"
          ? replan(fixture.input)
          : generatePlan(fixture.input);

      // Byte-identical to the committed expectation.
      expect(`${JSON.stringify(output, null, 2)}\n`).toBe(expected);

      const plan = "diff" in output ? output.plan : output;
      if (plan.kind === "PLAN") assertPlanInvariants(fixture.input, plan);
    });
  }
});
