import { expect, test } from "@playwright/test";

test.describe("theme", () => {
  test("applies a saved theme before first paint", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    // Read the attribute as soon as the DOM is parsed, before React hydrates.
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    expect(
      await page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe("dark");
  });

  test("is light by default, whatever the system prefers", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/today");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the toggle switches theme and persists", async ({ page, isMobile }) => {
    test.skip(isMobile, "toggle sits in the top bar from 640px");
    await page.goto("/today");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
