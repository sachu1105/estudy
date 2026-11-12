import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

async function person(browser: Browser, label: string) {
  const context = await browser.newContext({
    ...test.info().project.use,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedAndLogin(page, label);
  return page;
}

test.describe("notification menu", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the bell counts, opens a menu, marks read and deletes", async ({
    page,
    browser,
  }) => {
    const project = test.info().project.name;
    await seedAndLogin(page, `bell-a-${project}`);
    await page.goto("/groups/friends?tab=add");
    const handle = (await page.getByText(/Yours is @/).textContent())!.match(
      /@([a-z0-9_]+)/,
    )![1]!;

    const other = await person(browser, `bell-b-${project}`);
    await other.goto("/groups/friends?tab=add");
    await other.getByLabel("Name or username").fill(handle);
    const people = other.getByRole("list", { name: "People" });
    await people.getByRole("button", { name: /^Add / }).click();
    await expect(people.getByText("Requested")).toBeVisible();
    await other.context().close();

    await page.goto("/today");
    const bell = page.getByRole("button", { name: "Notifications, 1 unread" });
    await bell.click();
    // A popover from md up, a bottom sheet on a phone: a dialog either way.
    const menu = page.getByRole("dialog");
    const row = menu.getByRole("button", { name: /sent you a friend request/ });
    await expect(row).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await menu.getByRole("button", { name: "Mark as read" }).click();
    // The phone's sheet is modal, so the bell behind it is hidden from the a11y tree.
    await expect(
      page.getByRole("button", {
        name: "Notifications",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveCount(1);
    await expect(menu.getByRole("button", { name: "Mark as read" })).toHaveCount(0);

    await menu.getByRole("button", { name: "Delete notification" }).click();
    await expect(row).toHaveCount(0);
    await expect(menu.getByText(/Nothing new/)).toBeVisible();

    // Deleted for good: the full page has nothing either.
    await menu.getByRole("link", { name: "See all notifications" }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByText("Nothing new")).toBeVisible();
  });
});
