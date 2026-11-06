import { expect, test, type Browser, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";
import { grantElite } from "./support/db";

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
  const email = await seedAndLogin(page, label);
  return { page, email };
}

test.describe("the papers library", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an admin lists a paper for sale and in Elite; a free user can buy it, an Elite user has it", async ({
    page,
    browser,
    isMobile,
  }) => {
    test.setTimeout(150_000);
    const project = test.info().project.name;
    const title = `LDC library ${project}${Date.now()}`;

    // The admin's paper, with its key, uploaded in Tests as anyone's would be.
    await seedAndLogin(page, `library-admin-${project}`, "ADMIN");
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: `${title}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    const paperId = page.url().split("/").pop()!;
    // Its owner gets the file itself (a short storage link).
    const own = await page.request.get(`/api/omr/${paperId}/file`, {
      maxRedirects: 0,
    });
    expect(own.status()).toBe(302);
    await page.goto(`${page.url()}/key`);
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Questions").fill("4");
    await page.getByRole("button", { name: "Save marking" }).click();
    await expect(page.getByText(/4 questions, A–D/)).toBeVisible();
    await page.getByLabel("Paste the key").fill("AAAA");
    await page.getByRole("button", { name: "Fill the key" }).click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Saved",
    );

    // Admin > Papers: ₹149, free with Elite, saved as a draft, then published.
    await page.goto("/admin/papers");
    await page.getByRole("button", { name: "New paper or bundle" }).click();
    await page.getByLabel("Name").fill(title);
    await page.getByRole("checkbox", { name: title }).click();
    await page.getByRole("radio", { name: "Paid" }).click();
    await page.getByLabel("Price in rupees").fill("149");
    await page
      .getByRole("group", { name: "Included free with" })
      .getByText("Elite")
      .click();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const entry = page
      .getByRole("list", { name: "Library" })
      .getByRole("listitem")
      .filter({ hasText: title });
    await expect(entry.getByText("Draft")).toBeVisible();
    await expect(entry).toContainText("free with Elite");
    await entry.getByRole("button", { name: "Publish" }).click();
    await expect(entry.getByText("Published")).toBeVisible();

    // A free user: Tests points to the Store, where it's listed with its price.
    const free = await person(browser, `library-free-${project}`);
    await free.page.goto("/tests");
    await free.page
      .getByRole("main")
      .getByRole("link", { name: "Store", exact: true })
      .click();
    await expect(free.page).toHaveURL(/\/store$/);
    await free.page.getByLabel("Search the store").fill(title);
    const row = free.page
      .getByRole("list", { name: "Store" })
      .getByRole("link", { name: new RegExp(title) });
    await expect(row).toContainText("₹149");
    await expect(row).toContainText("Free with Elite");
    expect(await noSideScroll(free.page)).toBeLessThanOrEqual(0);
    await row.click();
    await expect(free.page.getByText("From the studypods store")).toBeVisible();
    await expect(free.page.getByLabel("Locked")).toHaveCount(1);
    await expect(
      free.page.getByText(/Or get it free with Elite/),
    ).toBeVisible();
    await free.page.getByRole("button", { name: "Buy · ₹149" }).click();
    await free.page.getByRole("button", { name: "Pay ₹149" }).click();
    // Paid: straight to Tests, the paper ready to sit.
    await expect(free.page).toHaveURL(/\/tests\?added=[0-9a-f-]{36}$/);
    await expect(
      free.page.getByRole("status").filter({ hasText: "is in your tests" }),
    ).toContainText(`${title} is in your tests`);
    // Under "Your bundles", as a bundle: how it was got and none attempted yet.
    const bought = free.page
      .getByRole("region", { name: "Your bundles" })
      .getByRole("link", { name: new RegExp(title) });
    await expect(bought).toContainText("Bought · from the Store");
    await expect(bought).toContainText("0 of 1 attempted");
    await bought.click();
    await expect(free.page.getByText("Not attempted")).toBeVisible();

    // An Elite user: in their plan, the paper opens without paying.
    const elite = await person(browser, `library-elite-${project}`);
    await grantElite(elite.email);
    await elite.page.goto("/store");
    await elite.page.getByRole("button", { name: "In your plan" }).click();
    const eliteRow = elite.page
      .getByRole("list", { name: "Store" })
      .getByRole("link", { name: new RegExp(title) });
    await expect(eliteRow).toContainText("In your plan");
    await eliteRow.click();
    await expect(
      elite.page.getByText(/Free with your plan while you're subscribed/),
    ).toBeVisible();
    await elite.page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(elite.page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    // Not theirs: never the file, only a personal copy marked with their name, to read.
    const copy = await elite.page.request.get(`/api/omr/${paperId}/file`, {
      maxRedirects: 0,
    });
    expect(copy.status()).toBe(200);
    expect(copy.headers()["content-type"]).toBe("application/pdf");
    expect(copy.headers()["cache-control"]).toContain("no-store");
    await expect(
      elite.page.getByText(/your copy, marked with your name/),
    ).toBeVisible();
    await expect(
      elite.page.getByRole("link", { name: "Open the PDF in a new tab" }),
    ).toHaveCount(0);
    await elite.page.getByRole("button", { name: "Start exam" }).click();
    await elite.page.getByRole("button", { name: "Start now" }).click();
    if (isMobile)
      await elite.page.getByRole("radio", { name: /^Sheet/ }).click();
    await elite.page
      .getByRole("button", { name: "Question 1, option A" })
      .click();
    await elite.page
      .getByRole("button", { name: "Submit", exact: true })
      .click();
    await elite.page.getByRole("button", { name: "Submit sheet" }).click();
    await expect(elite.page.locator("p", { hasText: "/ 4" })).toHaveText(
      /^1\s*\/ 4$/,
    );
    expect(await noSideScroll(elite.page)).toBeLessThanOrEqual(0);
  });
});
