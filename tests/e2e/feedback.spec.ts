import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

async function person(
  browser: Browser,
  label: string,
  role: "USER" | "ADMIN" = "USER",
) {
  const context = await browser.newContext({
    ...test.info().project.use,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedAndLogin(page, label, role);
  return page;
}

test.describe("feedback", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rate, suggest an idea, the team opens it, someone backs it", async ({
    page,
    browser,
  }) => {
    const project = test.info().project.name;
    const title = `Night mode timer ${project} ${Date.now()}`;
    await seedAndLogin(page, `fb-a-${project}`);

    // Rate: the stars, a line, then a quiet summary.
    await page.goto("/feedback");
    await expect(
      page.getByRole("heading", { name: "Help shape studypods" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page
      .getByRole("radiogroup", { name: "Rate studypods" })
      .getByRole("radio", { name: "4, Great" })
      .click();
    await page
      .getByRole("textbox", { name: "What would make it a 5?" })
      .fill("Malayalam questions");
    await page.getByRole("button", { name: "Save rating" }).click();
    await expect(page.getByText("Your rating")).toBeVisible();

    // Suggest: it waits for review, seen only under Mine.
    await page.getByRole("button", { name: "Suggest an idea" }).click();
    await page.getByLabel("Your idea in a few words").fill(title);
    await page.getByRole("radio", { name: "Tests" }).click();
    await page.getByRole("button", { name: "Send idea" }).click();
    const mine = page.getByRole("list", { name: "mine ideas" });
    await expect(mine.getByText(title)).toBeVisible();
    await expect(mine.getByText("Waiting for review")).toBeVisible();

    // The team opens it for votes.
    const admin = await person(browser, `fb-admin-${project}`, "ADMIN");
    await admin.goto("/admin/feedback?tab=ideas");
    expect(await noSideScroll(admin)).toBeLessThanOrEqual(0);
    const card = admin.getByRole("listitem").filter({ hasText: title });
    await card.getByRole("combobox", { name: "Status" }).click();
    await admin.getByRole("option", { name: "Open for votes" }).click();
    await card.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Saved. They've been told.")).toBeVisible();

    // Someone else backs it; the count goes up and stays up.
    const other = await person(browser, `fb-b-${project}`);
    await other.goto("/feedback");
    const vote = other.getByRole("button", { name: `I'd use this: ${title}` });
    // Wait for the server to keep it before reloading.
    await Promise.all([
      other.waitForResponse((r) => r.request().method() === "POST"),
      vote.click(),
    ]);
    await expect(vote).toHaveAttribute("aria-pressed", "true");
    await expect(vote).toContainText("1");
    await other.reload();
    await expect(
      other.getByRole("button", { name: `I'd use this: ${title}` }),
    ).toHaveAttribute("aria-pressed", "true");

    // The author was told the team opened it.
    await page.goto("/notifications");
    await expect(
      page.getByText("The studypods team answered your feedback").first(),
    ).toBeVisible();
  });

  test("report a problem, privately, and see the team's reply", async ({
    page,
    browser,
  }) => {
    const project = test.info().project.name;
    const body = `The answer sheet froze on question 40 (${project} ${Date.now()})`;
    await seedAndLogin(page, `fb-c-${project}`);

    await page.goto("/feedback?tab=problems&from=/tests");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await expect(page.getByLabel("Where? (optional)")).toHaveValue("/tests");
    await page.getByLabel("What happened?").fill(body);
    await page.getByRole("button", { name: "Send report" }).click();
    const reports = page.getByRole("region", { name: "Your reports" });
    await expect(reports.getByText(body)).toBeVisible();
    await expect(reports.getByText("Received")).toBeVisible();

    const admin = await person(browser, `fb-admin2-${project}`, "ADMIN");
    await admin.goto("/admin/feedback");
    const card = admin.getByRole("listitem").filter({ hasText: body });
    await card.getByRole("button", { name: "Reply" }).click();
    await card
      .getByRole("textbox", { name: "Reply" })
      .fill("Fixed, thank you!");
    await card.getByRole("combobox", { name: "Status" }).click();
    await admin.getByRole("option", { name: "Fixed" }).click();
    await card.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Saved. They've been told.")).toBeVisible();

    await page.reload();
    await expect(reports.getByText("Fixed, thank you!")).toBeVisible();
    // A fix with credit puts them on the wall.
    await page.goto("/feedback?tab=contributors");
    await expect(page.getByText("(you)")).toBeVisible();
  });
});
