import { expect, test, type Browser, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

async function person(browser: Browser, label: string, role?: "ADMIN") {
  const context = await browser.newContext({
    ...test.info().project.use,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedAndLogin(page, label, role);
  return page;
}

test.describe("selling in the Store", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a seller lists a keyed paper, an admin approves it, and anyone can add it", async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    const project = test.info().project.name;
    const title = `Seller set ${project}${Date.now()}`;

    // The seller's paper, keyed in Tests as anyone's would be.
    await seedAndLogin(page, `store-seller-${project}`);
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: `${title} paper.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    await page.goto(`${page.url()}/key`);
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Questions").fill("4");
    await page.getByRole("button", { name: "Save marking" }).click();
    await expect(page.getByText(/4 questions, A–D/)).toBeVisible();
    await page.getByLabel("Paste the key").fill("ABCD");
    await page.getByRole("button", { name: "Fill the key" }).click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Saved",
    );

    // Sell it from the Store: free (paid squads are off), sent for review.
    await page.goto("/store");
    await page.getByRole("link", { name: "Sell your papers" }).first().click();
    await expect(page).toHaveURL(/\/store\/sell$/);
    await page.getByLabel("Name").fill(title);
    await page.getByRole("checkbox", { name: `${title} paper` }).click();
    await page.getByRole("checkbox", { name: /mine to share/ }).click();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Send for review" }).click();
    await expect(page).toHaveURL(/\/bundles\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Waiting for review")).toBeVisible();
    const bundleUrl = page.url();

    // Nobody else finds it yet.
    const buyer = await person(browser, `store-buyer-${project}`);
    await buyer.goto("/store");
    await expect(buyer.getByText(title)).toHaveCount(0);

    // An admin reads the paper and approves it.
    const admin = await person(browser, `store-admin-${project}`, "ADMIN");
    await admin.goto("/admin/papers");
    const entry = admin
      .getByRole("list", { name: "Waiting for review" })
      .getByRole("listitem")
      .filter({ has: admin.getByRole("heading", { name: title }) });
    await expect(entry).toContainText("keyed");
    expect(await noSideScroll(admin)).toBeLessThanOrEqual(0);
    await entry.getByRole("button", { name: "Approve" }).click();
    await expect(
      admin
        .getByRole("list", { name: "Live from sellers" })
        .getByRole("heading", { name: title }),
    ).toBeVisible();

    // Live: the seller sees it, and anyone can add it from the Store.
    await page.goto(bundleUrl);
    await expect(page.getByText("Live in the Store")).toBeVisible();
    await buyer.goto("/store");
    await buyer.getByLabel("Search the store").fill(title);
    const card = buyer
      .getByRole("list", { name: "Store" })
      .getByRole("link", { name: new RegExp(title) });
    await expect(card).toContainText("Own key");
    await expect(card).toContainText("Free");
    await card.click();
    await expect(buyer.getByText(/Answer key by/)).toBeVisible();
    await buyer.getByRole("button", { name: "Add to my tests" }).click();
    await expect(buyer).toHaveURL(/\/tests\?added=[0-9a-f-]{36}$/);
    expect(await noSideScroll(buyer)).toBeLessThanOrEqual(0);
    // The buyer's tile says when they added it.
    await expect(
      buyer
        .getByRole("region", { name: "Your bundles" })
        .getByRole("link", { name: new RegExp(title) }),
    ).toContainText(/Added free \d{1,2} \w{3} · from the Store/);

    // The seller sees it counted, with the add and its time, nobody named.
    await page.goto(bundleUrl);
    const doing = page.getByRole("region", { name: "How it's doing" });
    await expect(doing.getByText("Have it")).toBeVisible();
    await expect(
      doing.getByRole("list", { name: "Latest adds and sales" }),
    ).toContainText("Added free");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });
});
