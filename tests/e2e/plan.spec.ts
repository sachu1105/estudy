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

    // The exam pod now opens the plan.
    await page.goto(`/pods/exam/${examId}`);
    await expect(page.getByRole("link", { name: "Open plan" })).toBeVisible();
  });
});
