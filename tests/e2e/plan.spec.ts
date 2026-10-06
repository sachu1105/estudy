import { expect, test, type Page } from "@playwright/test";

import { seedParsedDraft } from "./support/db";

async function examPod(page: Page, title: string) {
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };
  const id = await seedParsedDraft(me.id, title);
  await page.goto(`/syllabus/${id}`);
  await page.getByRole("button", { name: "Confirm syllabus" }).click();
  await expect(page).toHaveURL(new RegExp(`/pods/exam/${id}$`));
  return id;
}

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("study plan", () => {
  test("from the exam pod through four steps to a plan that explains itself", async ({
    page,
  }) => {
    const title = `Plan ${test.info().project.name} ${Date.now()}`;
    const examId = await examPod(page, title);

    await page.getByRole("button", { name: "Create study plan" }).click();
    await expect(page).toHaveURL(/\/plan\/new\/[0-9a-f-]{36}\/timeline$/);
    const setup = page.url().replace(/\/timeline$/, "");

    // 1. Exam date: a beginner, finishing in 60 days.
    await page.getByRole("switch", { name: "I'm new to PSC" }).click();
    await page.getByRole("button", { name: "60 days" }).click();
    await expect(page.getByText(/60\s+days of study/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // 2. Time.
    await expect(page).toHaveURL(`${setup}/time`);
    await page.getByRole("button", { name: "2 h a day" }).click();
    await page.getByRole("button", { name: "More time on Sunday" }).click();
    await expect(page.getByLabel("Sunday: 2 h 15 min")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // 3. Subjects: a beginner starts at 1; raise one, then go back and forth.
    await expect(page).toHaveURL(`${setup}/subjects`);
    await expect(page.getByText(/This needs about/)).toBeVisible();
    const constitution = page
      .getByRole("article")
      .filter({ hasText: "Indian Constitution" });
    await expect(
      constitution.getByRole("radio", { name: "1, new to me" }),
    ).toBeChecked();
    await constitution.getByRole("radio", { name: "4, good" }).click();
    await constitution.getByRole("radio", { name: "Intense" }).click();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(`${setup}/time`);
    await expect(page.getByLabel("Sunday: 2 h 15 min")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      constitution.getByRole("radio", { name: "4, good" }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // 4. Review and build.
    await expect(page).toHaveURL(`${setup}/review`);
    await expect(page.getByText("Yes: gentler first week")).toBeVisible();
    await page.getByRole("button", { name: "Build my plan" }).click();
    await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}\?new=1$/);
    await expect(
      page.getByRole("heading", { name: "Your plan is ready" }),
    ).toBeVisible();
    const today = page.getByRole("region", { name: "Today" });
    await expect(today.getByText(/^Study /).first()).toBeVisible();
    await today.getByText("Why this?").first().click();
    await expect(today.getByText(/min in all: /).first()).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Hand edits (rule 14): move a task, see it marked, then reset it.
    const tomorrow = page.getByRole("region", { name: "Tomorrow" });
    const firstTask = today
      .getByRole("button", { name: /^Change Study / })
      .first();
    await firstTask.click();
    await page.getByRole("menuitem", { name: "Move to another day" }).click();
    const target = await page
      .getByLabel("Day", { exact: true })
      .getAttribute("min");
    const next = new Date(`${target}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    await page
      .getByLabel("Day", { exact: true })
      .fill(next.toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Task moved")).toBeVisible();
    await expect(tomorrow.getByText(/placed by you/).first()).toBeVisible();
    // Part numbers follow the order on screen, so find the moved block by its mark.
    await tomorrow
      .getByRole("listitem")
      .filter({ hasText: "placed by you" })
      .getByRole("button", { name: /^Change Study / })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Reset to suggested" }).click();
    await expect(page.getByText("Back to the suggested plan")).toBeVisible();
    await expect(page.getByText(/placed by you/)).toHaveCount(0);

    // A task of the user's own.
    await today.getByRole("button", { name: "Add a task on today" }).click();
    await page.getByLabel("What").fill("Solve the 2023 paper");
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(
      page
        .getByRole("region", { name: "Today" })
        .getByText("Solve the 2023 paper"),
    ).toBeVisible();

    // Re-plan on demand keeps it.
    await page.getByRole("button", { name: "Re-plan now" }).click();
    await expect(page.getByText("Plan re-made from today")).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Today" })
        .getByText("Solve the 2023 paper"),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // How the plan was built (rule 14).
    await page.getByRole("link", { name: "How your plan was built" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "How your plan was built" }),
    ).toBeVisible();
    await expect(page.getByText("Indian Constitution").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The rules" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The calendar: today links into the plan.
    await page.goto("/calendar");
    await expect(
      page.getByRole("heading", { level: 1, name: "Calendar" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The exam pod now opens the plan, and a topic says when it comes up.
    await page.goto(`/pods/exam/${examId}`);
    await expect(page.getByRole("link", { name: "Open plan" })).toBeVisible();
    await page
      .getByRole("link", { name: "Indian Constitution", exact: true })
      .click();
    await page.getByRole("link", { name: /^Preamble/ }).click();
    await expect(
      page.getByRole("heading", { name: "In your plan" }),
    ).toBeVisible();
    await expect(page.getByText("Why this?").first()).toBeVisible();
  });
});
