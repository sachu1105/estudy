import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("plans and reminders", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the pricing page lists the three plans and is readable signed out", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1, name: "Pricing" })).toBeVisible();
    for (const plan of ["Free", "Pro", "Elite"]) {
      await expect(
        page.getByRole("heading", { level: 2, name: plan, exact: true }),
      ).toBeVisible();
    }
    // Prices come from the entitlements table, so they can't drift from the limits.
    await expect(page.getByText("₹199")).toBeVisible();
    await expect(page.getByText("₹399")).toBeVisible();
    // Billing is off during launch, so nothing is for sale yet.
    await expect(page.getByText(/Free during launch/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start free" }).first(),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });

  test("the plan page explains the launch offer and never shows a dead button", async ({
    page,
  }) => {
    await seedAndLogin(page, `plan-${test.info().project.name}`);
    await page.goto("/settings");
    await page.getByRole("link", { name: "See the plans" }).click();
    await expect(page).toHaveURL(/\/settings\/plan$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Your plan" }),
    ).toBeVisible();
    await expect(page.getByText("your plan", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Free during launch: you have every Elite feature/),
    ).toBeVisible();
    // No checkout button while payments are closed.
    await expect(page.getByRole("button", { name: /^Upgrade to/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(/nothing of yours is deleted/i),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });

  test("reminders can be switched and timed, and the times are checked", async ({
    page,
  }) => {
    await seedAndLogin(page, `remind-${test.info().project.name}`);
    await page.goto("/settings");
    const reminders = page.getByRole("region", { name: "Reminders" });
    await expect(reminders).toBeVisible();

    await reminders.getByLabel("Streak at risk").click();
    await reminders.getByLabel("Your study window starts at").fill("06:30");
    await reminders.getByLabel("Quiet from").fill("23:00");
    await reminders.getByLabel("Quiet until").fill("06:00");
    await page.getByRole("button", { name: "Save reminders" }).click();
    await expect(page.getByText("Reminders saved")).toBeVisible();

    await page.reload();
    const saved = page.getByRole("region", { name: "Reminders" });
    await expect(saved.getByLabel("Streak at risk")).not.toBeChecked();
    await expect(saved.getByLabel("Your study window starts at")).toHaveValue(
      "06:30",
    );
    await expect(saved.getByLabel("Quiet from")).toHaveValue("23:00");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });

  test("the app is installable: a manifest and an offline page", async ({
    page,
  }) => {
    const manifest = await page.request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);
    const body = (await manifest.json()) as {
      name: string;
      start_url: string;
      display: string;
      icons: unknown[];
    };
    expect(body).toMatchObject({ start_url: "/today", display: "standalone" });
    expect(body.icons.length).toBeGreaterThan(1);

    await page.goto("/offline");
    await expect(
      page.getByRole("heading", { level: 1, name: /You're offline/ }),
    ).toBeVisible();
  });
});
