import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { datesIn, daysBetween, isoFromDmy } from "./dates";
import { readPscProgramme, scopeOf, type ProgrammePage } from "./psc-programme";

// Pages from real Kerala PSC programmes, as PDF.js reads them (fixtures/exam-calendar):
// each word with its position, and the page's links.
function fixture(name: string) {
  const file = path.join(process.cwd(), "fixtures/exam-calendar", name);
  return (JSON.parse(readFileSync(file, "utf8")) as { pages: ProgrammePage[] })
    .pages;
}

describe("dates", () => {
  it("reads dd/mm/yyyy and refuses dates that don't exist", () => {
    expect(isoFromDmy("05", "07", "2024")).toBe("2024-07-05");
    expect(isoFromDmy("31", "02", "2024")).toBeNull();
    expect(datesIn("23/07/2024 to 11/08/2024")).toEqual([
      "2024-07-23",
      "2024-08-11",
    ]);
    expect(daysBetween("2026-11-06", "2027-01-12")).toBe(67);
  });

  it("puts district names the programmes spell many ways in one spelling", () => {
    expect(scopeOf("THIRUVANANTH APURAM")).toBe("Thiruvananthapuram");
    expect(scopeOf("Kozhikkode")).toBe("Kozhikode");
    expect(scopeOf("KASARGODE")).toBe("Kasaragod");
    expect(scopeOf("STATEWIDE")).toBe("Statewide");
    expect(scopeOf("")).toBeNull();
  });
});

describe("a Kerala PSC examination programme", () => {
  it("reads a programme for confirmation: dates, the confirmation window, links", () => {
    const read = readPscProgramme(fixture("jan-2027-for-confirmation.json"));
    expect(read.title).toBe(
      "EXAMINATION PROGRAMME FOR THE MONTH OF JANUARY 2027",
    );
    expect(read.month).toBe("2027-01-01");
    expect(read.stage).toBe("FOR_CONFIRMATION");
    expect(read.problems).toEqual([]);
    expect(read.rows[0]).toMatchObject({
      sl: 1,
      catNo: "698/2025",
      post: "ASSISTANT DIRECTOR OF NATIONAL SAVINGS - DIRECT RECRUITMENT Main Examination",
      department: "THE KERALA NATIONAL SAVINGS SERVICE",
      scope: "Statewide",
      examOn: "2027-01-12",
      confirmNote: "Confirmation not required",
      ticketsFrom: "2026-12-28",
      candidates: 33122,
    });
    expect(read.rows[0]!.syllabusUrl).toMatch(/^https:\/\/www\.keralapsc/);
    const station = read.rows.find((r) => r.catNo === "047/2026");
    expect(station).toMatchObject({
      post: "STATION OFFICER(TRAINEE) - DIRECT RECRUITMENT",
      examOn: "2027-01-20",
      confirmFrom: "2026-10-26",
      confirmTo: "2026-11-14",
      confirmNote: null,
      ticketsFrom: "2027-01-05",
    });
    // The notes above the table are kept for the admin.
    expect(read.notes).toContain("Special Information");
  });

  it("fills a post merged across districts into every district's row", () => {
    const read = readPscProgramme(fixture("jul-2024-modified.json"));
    expect(read.stage).toBe("MODIFIED");
    expect(read.month).toBe("2024-07-01");
    expect(read.problems).toEqual([]);
    const upst = read.rows.filter((r) => r.catNo === "707/2023");
    expect(upst.map((r) => r.scope).slice(0, 3)).toEqual([
      "Thiruvananthapuram",
      "Kollam",
      "Pathanamthitta",
    ]);
    for (const row of upst)
      expect(row).toMatchObject({
        post: "U P SCHOOL TEACHER (MALAYALAM MEDIUM)",
        examOn: "2024-07-06",
        timeText: "01.30 pm to 03.30 pm",
        ticketsFrom: "2024-06-22",
      });
  });

  it("gives every post in a common test the test's date and batches", () => {
    const read = readPscProgramme(fixture("jul-2024-modified.json"));
    const common = read.rows.filter((r) => r.sl >= 34 && r.sl <= 39);
    expect(common.length).toBe(6);
    for (const row of common)
      expect(row).toMatchObject({
        examOn: "2024-07-11",
        timeText: "Batch I 9.00 am to 11.30 am Batch II 11.15 am to 01.45 pm",
      });
    // Its own post on each row, not the first one's.
    expect(new Set(common.map((r) => r.catNo)).size).toBeGreaterThan(1);
    // The modification's reason cancels a post (in Malayalam: റദ്).
    expect(read.cancelled).toEqual(["542/2023"]);
  });

  it("reads short post names, deleted rows and posts split over pages", () => {
    const read = readPscProgramme(fixture("may-2024-after-confirmation.json"));
    expect(read.stage).toBe("AFTER_CONFIRMATION");
    expect(read.problems).toEqual([]);
    // "583/2022 Lecturer in Violin" is printed as one run of text.
    expect(read.rows.find((r) => r.sl === 2)).toMatchObject({
      catNo: "583/2022",
      post: "Lecturer in Violin",
      examOn: "2024-05-03",
    });
    // Row 3 is "Deleted": not an exam, and its post is cancelled.
    expect(read.rows.some((r) => r.sl === 3)).toBe(false);
    expect(read.cancelled).toContain("510/2023");
    expect(read.cancelled).not.toContain("05/2024");
    // "CLERK" sits by the category column; one post over three pages of districts.
    const clerk = read.rows.filter((r) => r.catNo === "445/2023");
    expect(clerk.length).toBeGreaterThan(10);
    for (const row of clerk)
      expect(row).toMatchObject({ post: "CLERK", examOn: "2024-05-04" });
    expect(read.rows.find((r) => r.sl === 69)).toMatchObject({
      catNo: "092/2023",
      post: "TRADE INSTRUCTOR GR.II (ELECTROPLATING)",
      examOn: "2024-05-10",
      timeText: "09.30 am to 12.00 pm",
    });
  });

  it("says what it couldn't read instead of guessing", () => {
    const read = readPscProgramme([
      {
        items: [{ str: "A notice about centres", x: 40, y: 500, w: 200 }],
        links: [],
      },
    ]);
    expect(read.rows).toEqual([]);
    expect(read.problems).toContain(
      "No table header (Sl. No., Name of Post) found.",
    );
  });
});
