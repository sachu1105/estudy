import { expect, test } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { enablePaidSquads, grantElite } from "./support/db";

test.describe("paid squads", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an elite owner sells a pass, and someone pays to get in", async ({
    page,
    browser,
  }) => {
    await enablePaidSquads();
    const email = await seedAndLogin(page, "seller");
    await grantElite(email);

    // The app re-reads settings on a timer (30s in a production build): wait for the
    // switch to reach it rather than guessing.
    test.setTimeout(90_000);
    const paidSwitch = page.getByRole("switch", { name: "Paid squad" });
    await expect(async () => {
      await page.goto("/groups");
      await page.getByRole("button", { name: "Create squad" }).first().click();
      await expect(paidSwitch).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 45_000, intervals: [2_000] });
    await page.getByLabel("Name").fill("Paid batch");
    await paidSwitch.click();
    await page.getByLabel("Price").fill("499");
    await page
      .getByLabel("What members get")
      .fill("Daily mocks and a weekly doubt class");
    await page.getByRole("button", { name: "Create squad" }).last().click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]+/);
    const squadUrl = page.url();

    // Someone else sees the price, what they get and the seller's verified mark.
    const other = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const buyer = await other.newPage();
    await seedAndLogin(buyer, "buyer");
    await buyer.goto(squadUrl);
    await expect(
      buyer.getByRole("heading", { level: 1, name: /Paid batch.*verified/ }),
    ).toBeVisible();
    await expect(
      buyer.getByText("Daily mocks and a weekly doubt class"),
    ).toBeVisible();

    await buyer.getByRole("button", { name: "Get a pass · ₹499" }).click();
    // The card itself steps on: review, then the receipt. No second window.
    const pass = buyer.getByRole("region", { name: "Squad pass" });
    await expect(
      pass.getByRole("heading", { name: "Check and pay" }),
    ).toBeFocused();
    await expect(pass.getByText("Demo payment", { exact: true })).toBeVisible();
    await pass.getByRole("button", { name: "Pay ₹499" }).click();
    await expect(
      pass.getByRole("heading", { name: "Payment done" }),
    ).toBeVisible();
    await expect(pass.getByText("₹499 · demo")).toBeVisible();
    await pass.getByRole("button", { name: "Open the squad" }).click();
    await expect(
      buyer.getByRole("navigation", { name: "Squad" }).first(),
    ).toBeVisible();
    await other.close();

    // The owner sees the sale.
    await page.goto(`${squadUrl}/settings`);
    await expect(
      page.getByRole("heading", { name: "Passes sold" }),
    ).toBeVisible();
    await expect(page.getByText("from 1 pass, demo payments")).toBeVisible();

    // And finds who paid on the members page.
    await page.goto(`${squadUrl}/members`);
    await page.getByRole("link", { name: "With a pass · 1" }).click();
    await expect(page.getByText(/Squad pass until/)).toBeVisible();
  });
});
