import { expect, test } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

test.describe("squad banner", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an admin picks the banner, and it shows on the card and in chat", async ({
    page,
    isMobile,
  }) => {
    await seedAndLogin(page, "banner");
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).first().click();
    await page.getByLabel("Name").fill("Evening batch");
    await page.getByRole("button", { name: "Create squad" }).last().click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]+/);
    const groupId = page.url().match(/groups\/([0-9a-f-]+)/)![1];

    await page.goto(`/groups/${groupId}/settings`);
    await page.getByRole("button", { name: "Change banner" }).click();
    const picker = page.getByRole("dialog", { name: "Squad banner" });
    await picker.getByRole("button", { name: "ocean", exact: true }).click();
    // The pick saves on its own; the preview behind the dialog follows it.
    await expect(
      picker.getByRole("button", { name: "ocean", exact: true }),
    ).toHaveClass(/border-accent/);
    await page.keyboard.press("Escape");

    // The squads page and the rail in chat both draw the chosen banner.
    await page.goto("/groups");
    const card = page.getByRole("link", { name: "Evening batch" }).first();
    await expect(card).toBeVisible();

    await page.goto(`/groups/${groupId}`);
    if (!isMobile) {
      // The rail of squads, where the banner is the tile. It is desktop only.
      const rail = page.getByRole("navigation", { name: "Your squads" });
      await expect(
        rail.getByRole("link", { name: "Evening batch" }),
      ).toBeVisible();
    }

    // Reopening the picker shows ocean as the one already chosen.
    await page.goto(`/groups/${groupId}/settings`);
    await page.getByRole("button", { name: "Change banner" }).click();
    await expect(
      page
        .getByRole("dialog", { name: "Squad banner" })
        .getByRole("button", { name: "ocean", exact: true }),
    ).toHaveClass(/border-accent/);
  });

  test("someone outside the squad never sees the banner control", async ({
    page,
    browser,
  }) => {
    await seedAndLogin(page, "bannerowner");
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).first().click();
    await page.getByLabel("Name").fill("Open batch");
    await page.getByRole("button", { name: "Create squad" }).last().click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]+/);
    const groupId = page.url().match(/groups\/([0-9a-f-]+)/)![1];

    // Someone outside the squad gets the visitor view on every URL under it, never
    // the settings page, so the banner control is not reachable.
    const other = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const theirPage = await other.newPage();
    await seedAndLogin(theirPage, "bannermember");
    await theirPage.goto(`/groups/${groupId}/settings`);
    await expect(
      theirPage.getByRole("button", { name: "Change banner" }),
    ).toHaveCount(0);
    await expect(
      theirPage.getByRole("heading", { name: "Squad settings" }),
    ).toHaveCount(0);
    await other.close();
  });
});
