import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("renders a placeholder page for every app route", async ({ page }) => {
    const routes: [string, string | RegExp][] = [
      ["/today", "Today"],
      ["/plan", /^(Plan|Study plan)$/],
      ["/calendar", "Calendar"],
      ["/pods", "Pods"],
      ["/syllabus", "Pods"], // the list moved into the pods home
      ["/tests", "Tests"],
      ["/groups", "Groups"],
      ["/rank", "Rank"],
      ["/progress", "Progress"],
      ["/settings", "Settings"],
    ];
    for (const [path, title] of routes) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
    }
  });

  test("uses the sidebar on desktop and the tab bar on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/today");
    const nav = page
      .getByRole("navigation", { name: "Main" })
      .filter({ visible: true });
    await expect(nav).toHaveCount(1);
    await nav.getByRole("link", { name: "Plan" }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(nav.getByRole("link", { name: "Plan" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    if (isMobile) {
      await nav.getByRole("button", { name: "More" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Rank" })
        .click();
      await expect(page).toHaveURL(/\/rank$/);
    }
  });

  test("collapses the sidebar and remembers it across reloads", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "sidebar is desktop only");
    await page.goto("/today");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "collapsed",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "collapsed",
    );
  });

  test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
    await page.goto("/today");
    const input = page.getByPlaceholder("Search or jump to…");
    // The shortcut listener attaches on hydration; retry until the page is interactive.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(input).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await input.fill("progress");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/progress$/);
  });
});
