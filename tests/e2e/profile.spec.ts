import { expect, test } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

// A 1x1 PNG, enough for the server's byte sniff.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("profile", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("edits the profile, shares it, and the link opens for a stranger", async ({
    page,
    browser,
  }) => {
    await seedAndLogin(page, "profile");
    await page.goto("/settings");

    // The banner is there before anything is set, with the name from sign-up.
    await expect(
      page.getByRole("heading", { name: "Test Aspirant" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit profile" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit profile" });
    await dialog.getByLabel("Name others see").fill("Anjali N");
    await dialog
      .getByLabel("About you")
      .fill("Preparing for LDC 2026. Maths in the mornings.");
    await dialog
      .getByRole("button", { name: "Change photo" })
      .locator("xpath=preceding-sibling::input")
      .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Photo updated")).toBeVisible();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Anjali N" })).toBeVisible();
    await expect(
      page.getByText("Preparing for LDC 2026. Maths in the mornings."),
    ).toBeVisible();

    // Share it at an address of our own.
    const handle = `anjali_${Date.now().toString(36)}`;
    await page.getByLabel("Your address").fill(handle);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Address saved")).toBeVisible();
    await page.getByRole("switch", { name: "Share my profile" }).click();
    await expect(page.getByText("Profile is shared")).toBeVisible();

    // A signed-out stranger can open the link and sees what was shared.
    const stranger = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const theirPage = await stranger.newPage();
    await theirPage.goto(`/u/${handle}`);
    await expect(
      theirPage.getByRole("heading", { name: "Anjali N" }),
    ).toBeVisible();
    await expect(theirPage.getByText(`@${handle}`)).toBeVisible();
    await expect(
      theirPage.getByText("Preparing for LDC 2026. Maths in the mornings."),
    ).toBeVisible();
    // The sign-up invitation, since they have no account.
    await expect(
      theirPage.getByRole("link", { name: "Get started free" }),
    ).toBeVisible();

    // Turning sharing off closes the link again.
    await page.getByRole("switch", { name: "Share my profile" }).click();
    await expect(page.getByText("Profile is private again")).toBeVisible();
    const closed = await theirPage.goto(`/u/${handle}`);
    expect(closed?.status()).toBe(404);
    await stranger.close();
  });

  test("a handle that isn't shared, or isn't a handle at all, is not found", async ({
    page,
  }) => {
    for (const path of ["/u/nobody_here", "/u/settings"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
});
