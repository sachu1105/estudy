import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft, seedQuestions } from "./support/db";

const TOPICS = [
  "Preamble",
  "Fundamental rights",
  "Directive principles",
  "Rivers of Kerala",
];

/** A user of their own with an exam, its pods and a plan. */
async function userWithPlan(page: Page, label: string) {
  await seedAndLogin(page, label);
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };
  const id = await seedParsedDraft(me.id, `Tests ${label}`);
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
  return id;
}

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("mock tests", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a check test from Today: one question a screen, scored on the server, explained", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedQuestions(TOPICS);
    await userWithPlan(page, `checks-${test.info().project.name}`);

    await page.goto("/today");
    await page
      .getByRole("button", { name: /^Start Check test: / })
      .first()
      .click();
    await expect(page).toHaveURL(/\/test\/[0-9a-f-]{36}$/);
    await expect(page.getByText("1 of 5")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Answers survive a reload.
    await page.getByRole("button", { name: /^A / }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: /^A / })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Keys work: 1-4 answer, arrows move. Get two wrong on purpose.
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Next" }).click();
      await page.keyboard.press(i < 2 ? "2" : "1");
    }
    await page.getByRole("button", { name: "Flag" }).click();
    await page.getByRole("button", { name: "All questions" }).click();
    await expect(
      page.getByRole("button", { name: "Question 5, answered, flagged" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Finish test" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}$/);
    await expect(
      page.getByText("3 of 5", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText(/Explained: answer/).first()).toBeVisible();
    await expect(page.getByLabel("Correct").first()).toBeVisible();
    await expect(page.getByLabel("Wrong").first()).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Reporting a question.
    await page.getByRole("button", { name: "Report question 1" }).click();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByText("Thanks, it's reported")).toBeVisible();

    // The task is done on Today, and the result is in Tests.
    await page.goto("/tests");
    await expect(
      page.getByRole("link", { name: /Check: .*3 of 5 right/ }),
    ).toBeVisible();
  });

  test("section mocks are timed with negative marking; topics can be practised alone", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedQuestions(TOPICS);
    await userWithPlan(page, `mocks-${test.info().project.name}`);

    await page.goto("/tests");
    await page.getByRole("button", { name: "Section mock" }).first().click();
    await expect(page).toHaveURL(/\/test\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByText(/a third of a mark off/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.goto("/pods");
    await page
      .getByRole("region", { name: "Your exams" })
      .getByRole("link")
      .first()
      .click();
    await page
      .getByRole("link", { name: "Indian Constitution", exact: true })
      .click();
    await page.getByRole("link", { name: /^Preamble/ }).click();
    await page.getByRole("button", { name: "Practice 5 questions" }).click();
    await expect(page).toHaveURL(/\/test\/[0-9a-f-]{36}$/);
    await expect(page.getByText("1 of 5")).toBeVisible();
  });

  test("an admin imports questions, which wait to be checked, then verifies them", async ({
    page,
  }) => {
    await seedAndLogin(page, `qadmin-${test.info().project.name}`, "ADMIN");
    const tag = `${test.info().project.name}${Date.now()}`;
    await page.goto("/admin/questions");
    await page.getByRole("button", { name: "Import" }).click();
    await page
      .getByRole("textbox", { name: "Questions" })
      .fill(`Topic ${tag},2,What is ${tag}?,Yes,No,Maybe,Never,A,Because,Test`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Import" })
      .click();
    await expect(page.getByText("1 imported")).toBeVisible();

    await page.goto(
      `/admin/questions?status=PENDING&topic=${encodeURIComponent(`topic ${tag}`)}`,
    );
    await expect(page.getByText(`What is ${tag}?`)).toBeVisible();
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(
      page.getByText("Verified", { exact: true }).last(),
    ).toBeVisible();
    await page.goto(
      `/admin/questions?status=VERIFIED&topic=${encodeURIComponent(`topic ${tag}`)}`,
    );
    await expect(page.getByText(`What is ${tag}?`)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });
});
