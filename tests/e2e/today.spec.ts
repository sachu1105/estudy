import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft } from "./support/db";

/** A fresh exam with a plan built through the real setup, as a user would. */
async function withPlan(page: Page, title: string) {
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };
  const id = await seedParsedDraft(me.id, title);
  await page.goto(`/syllabus/${id}`);
  await page.getByRole("button", { name: "Confirm syllabus" }).click();
  await page.getByRole("button", { name: "Create study plan" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "2 h a day" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Build my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your plan is ready" }),
  ).toBeVisible();
}

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("today", () => {
  // One timer per user: this spec gets its own user so parallel runs can't stop its timer.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ticks a task, runs a study session, and keeps the streak", async ({
    page,
  }) => {
    const title = `Today ${test.info().project.name} ${Date.now()}`;
    await seedAndLogin(page, `today-${test.info().project.name}`);
    await withPlan(page, title);
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { level: 1, name: "Today" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Start next task: the focus view, with the timer running.
    await page.getByRole("link", { name: "Start next task" }).click();
    await expect(page).toHaveURL(/\/study\/[0-9a-f-]{36}$/);
    const timer = page.getByRole("timer");
    await expect(timer).not.toHaveText("--:--");
    await page.waitForTimeout(1500);
    const before = await timer.textContent();
    // A refresh carries on from the server's time.
    await page.reload();
    await expect(timer).not.toHaveText("--:--");
    expect((await timer.textContent())! >= before!).toBe(true);
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused")).toBeVisible();
    await page.getByRole("button", { name: "Material" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Finish and mark done" }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("region", { name: "Done" })).toBeVisible();
    await expect(page.getByLabel(/[1-9]\d* day streak/)).toBeVisible();

    // Untick from the list.
    await page
      .getByRole("region", { name: "Done" })
      .getByRole("checkbox")
      .first()
      .click();
    await expect(page.getByRole("region", { name: "Done" })).toHaveCount(0);

    // How the streak works is one tap away.
    await page.getByRole("button", { name: "How your streak works" }).click();
    await expect(page.getByRole("dialog")).toContainText("one missed day");
  });
});
