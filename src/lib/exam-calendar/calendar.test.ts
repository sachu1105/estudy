import { describe, expect, it } from "vitest";

import {
  confirmation,
  dueReminders,
  groupDates,
  programmeLinks,
  type DateRow,
} from "./calendar";

const row = (over: Partial<DateRow>): DateRow => ({
  id: "r1",
  board: "Kerala PSC",
  catNo: "707/2023",
  post: "U P SCHOOL TEACHER",
  department: "EDUCATION",
  scope: "Statewide",
  examOn: "2027-01-12",
  timeText: null,
  confirmFrom: null,
  confirmTo: null,
  confirmNote: null,
  ticketsFrom: null,
  mode: null,
  medium: null,
  duration: null,
  candidates: null,
  syllabusUrl: null,
  cancelled: false,
  source: null,
  ...over,
});

describe("the exam calendar", () => {
  it("finds programme PDFs on a board's page by their link text", () => {
    const html = `
      <a href="/sitemap">Sitemap</a>
      <a href="http://www.keralapsc.gov.in/sites/default/files/2026-10/for-confirmation-january-2027.pdf" type="application/pdf"
         >EXAMINATION PROGRAMME FOR THE MONTH OF JANUARY 2027 (FOR SUBMITTING CONFIRMATION)</a>
      <a href="/files/centre-change.pdf">Centre change notice</a>
      <a href="/files/feb.pdf"><span>Examination   Programme</span> February</a>
      <a href="javascript:alert(1)">Examination programme</a>`;
    expect(
      programmeLinks(
        html,
        "https://www.keralapsc.gov.in/examinations",
        "EXAMINATION PROGRAMME",
      ),
    ).toEqual([
      {
        url: "http://www.keralapsc.gov.in/sites/default/files/2026-10/for-confirmation-january-2027.pdf",
        text: "EXAMINATION PROGRAMME FOR THE MONTH OF JANUARY 2027 (FOR SUBMITTING CONFIRMATION)",
      },
      {
        url: "https://www.keralapsc.gov.in/files/feb.pdf",
        text: "Examination Programme February",
      },
    ]);
  });

  it("makes one exam of a post's districts on a date, adding up the candidates", () => {
    const groups = groupDates([
      row({ id: "a", scope: "Kollam", candidates: 10 }),
      row({ id: "b", scope: "Idukki", candidates: 5 }),
      row({
        id: "c",
        catNo: "698/2025",
        post: "ASSISTANT DIRECTOR",
        examOn: "2027-01-05",
      }),
    ]);
    expect(groups.map((g) => [g.catNo, g.scopes, g.candidates, g.ids])).toEqual(
      [
        ["698/2025", ["Statewide"], null, ["c"]],
        ["707/2023", ["Kollam", "Idukki"], 15, ["a", "b"]],
      ],
    );
  });

  it("says where confirmation stands", () => {
    const exam = {
      confirmFrom: "2026-10-26",
      confirmTo: "2026-11-14",
      confirmNote: null,
    };
    expect(confirmation(exam, "2026-10-20")).toEqual({
      state: "soon",
      from: "2026-10-26",
    });
    expect(confirmation(exam, "2026-11-06")).toEqual({
      state: "open",
      until: "2026-11-14",
      daysLeft: 8,
    });
    expect(confirmation(exam, "2026-11-15")).toEqual({ state: "closed" });
    expect(
      confirmation(
        {
          confirmFrom: null,
          confirmTo: null,
          confirmNote: "Confirmation not required",
        },
        "2026-11-06",
      ),
    ).toEqual({ state: "none" });
  });

  it("knows which reminders are due, across a window so a missed day still sends", () => {
    const exam = row({
      examOn: "2027-01-20",
      confirmFrom: "2026-10-26",
      confirmTo: "2026-11-14",
      ticketsFrom: "2027-01-05",
    });
    expect(dueReminders(exam, "2026-10-26")).toEqual(["CONFIRM_OPEN"]);
    expect(dueReminders(exam, "2026-11-12")).toEqual(["CONFIRM_CLOSING"]);
    expect(dueReminders(exam, "2026-11-20")).toEqual([]);
    expect(dueReminders(exam, "2027-01-06")).toEqual(["TICKETS"]);
    expect(dueReminders(exam, "2027-01-15")).toEqual(["TICKETS", "WEEK_TO_GO"]);
    expect(dueReminders(exam, "2027-01-19")).toEqual(["TICKETS", "DAY_BEFORE"]);
    expect(dueReminders(exam, "2027-01-21")).toEqual([]);
    expect(dueReminders({ ...exam, cancelled: true }, "2026-12-01")).toEqual([
      "CANCELLED",
    ]);
  });
});
