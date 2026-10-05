import { expect, test } from "@playwright/test";

test.describe("/dev/ui", () => {
  test("renders both theme panels", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(
      page.getByRole("heading", { level: 1, name: "Design system" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "light theme panel" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "dark theme panel" }),
    ).toBeVisible();
  });

  test("ticking a task moves it to the done group", async ({ page }) => {
    await page.goto("/dev/ui");
    const panel = page.getByRole("region", { name: "light theme panel" });
    await panel
      .getByRole("checkbox", { name: "Mark Fundamental rights as done" })
      .click();
    const done = panel.getByRole("region", { name: "Done" });
    await expect(done.getByText("Fundamental rights")).toBeVisible();
    await expect(panel.getByLabel("13 day streak")).toBeVisible();
  });

  test("answer reveal marks correct and wrong with icons", async ({ page }) => {
    await page.goto("/dev/ui");
    const panel = page.getByRole("region", { name: "light theme panel" });
    await panel.getByRole("button", { name: /Article 14/ }).click();
    await expect(panel.getByLabel("Wrong")).toBeVisible();
    await expect(panel.getByLabel("Correct")).toBeVisible();
  });
});
