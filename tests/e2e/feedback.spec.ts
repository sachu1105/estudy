import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("feedback", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rate studypods in the modal, then change it", async ({ page }) => {
    const project = test.info().project.name;
    const mobile = project === "mobile";
    await seedAndLogin(page, `fb-${project}`);

    // From the sidebar on a computer, from Settings on a phone.
    const open = async () => {
      if (mobile) {
        await page.goto("/settings");
        await page.getByRole("button", { name: "Rate", exact: true }).click();
      } else {
        await page.goto("/today");
        await page
          .getByRole("button", { name: "Feedback", exact: true })
          .click();
      }
    };

    await open();
    const dialog = page.getByRole("dialog", {
      name: "How is studypods for you?",
    });
    await expect(dialog).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await expect(
      dialog.getByRole("button", { name: "Send rating" }),
    ).toBeDisabled();

    await dialog
      .getByRole("radiogroup", { name: "Rate studypods" })
      .getByRole("radio", { name: "4, Great" })
      .click();
    await dialog
      .getByRole("textbox", { name: "What would make it a 5?" })
      .fill("Malayalam questions");
    await dialog.getByRole("button", { name: "Send rating" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Thank you, that means a lot")).toBeVisible();

    // Opening it again shows their rating, ready to change.
    await open();
    await expect(dialog.getByRole("radio", { name: "4, Great" })).toBeChecked();
    await expect(
      dialog.getByRole("textbox", { name: "What would make it a 5?" }),
    ).toHaveValue("Malayalam questions");
    await dialog.getByRole("radio", { name: "5, Love it" }).click();
    await dialog.getByRole("button", { name: "Update rating" }).click();
    await expect(dialog).toBeHidden();
  });

  test("there is no feedback page any more", async ({ page }) => {
    await seedAndLogin(page, `fb-gone-${test.info().project.name}`);
    const res = await page.goto("/feedback");
    expect(res?.status()).toBe(404);
  });
});
