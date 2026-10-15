import { expect, it } from "vitest";
import { MIN_BLOCK } from "@/lib/plan-engine";
import { splitMinutes, type ShareExam } from "./shares";

it("probe", () => {
  const bad: string[] = [];
  for (let total = 0; total <= 600; total++) {
    for (let count = 1; count <= 5; count++) {
      const exams: ShareExam[] = Array.from({ length: count }, (_, i) => ({
        id: `e${i}`,
        role: i === 0 ? "FOCUS" : "ALONGSIDE",
        endDate: `2026-0${i + 1}-01`,
      }));
      const slices = [...splitMinutes([total], exams).values()].map((d) => d[0]);
      slices.forEach((s, i) => {
        if (s !== 0 && s < MIN_BLOCK) bad.push(`total=${total} count=${count} idx=${i} slice=${s}`);
      });
    }
  }
  console.log(bad.length, "violations");
  console.log(bad.slice(0, 20).join("
"));
  expect(true).toBe(true);
});
