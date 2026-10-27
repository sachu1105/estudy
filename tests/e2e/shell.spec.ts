import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("renders a placeholder page for every app route", async ({ page }) => {
    const routes: [string, string | RegExp][] = [
      ["/today", "Today"],
      ["/pods", "Pods"],
      ["/syllabus", "Pods"], // the list moved into the pods home
      ["/tests", "Tests"],
      ["/groups", "Squads"],
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
    // Plan and calendar live inside each exam pod now, so the nav has no tab for them.
    await expect(nav.getByRole("link", { name: "Plan" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Pods" }).click();
    await expect(page).toHaveURL(/\/pods$/);
    await expect(nav.getByRole("link", { name: "Pods" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    if (isMobile) {
      // The profile sits in the tab bar, not behind an avatar in the top bar, and
      // opens straight onto settings.
      await expect(
        page.getByRole("button", { name: "Account menu" }),
      ).toBeHidden();
      const profile = nav.getByRole("link", { name: "Profile" });
      await profile.click();
      await expect(page).toHaveURL(/\/settings$/);
      await expect(profile).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
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
    await input.fill("squads");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/groups$/);
  });
});
