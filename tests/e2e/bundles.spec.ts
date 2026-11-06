import { expect, test, type Browser, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";
import { enablePaidSquads, grantElite } from "./support/db";

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

test.describe("paper bundles", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a squad owner sells a bundle of papers; a member buys it and sits a paper with its key", async ({
    page,
    browser,
    isMobile,
  }) => {
    test.setTimeout(180_000);
    const project = test.info().project.name;
    page.on("dialog", (dialog) => void dialog.accept());
    await enablePaidSquads();
    const email = await seedAndLogin(page, `bundle-owner-${project}`);
    await grantElite(email);

    // The owner's paper: 4 questions, key A A A A.
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: "LGS 2021.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
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

    // A squad with a member in it.
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).first().click();
    await page.getByLabel("Name").fill(`Bundles ${project}${Date.now()}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    const groupUrl = page.url();
    await page
      .getByRole("button", { name: /^More for / })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Members", exact: true }).click();
    await page.getByRole("button", { name: "New invite" }).click();
    const code = (await page.locator("li .font-mono").first().textContent())!;
    const member = await person(browser, `bundle-member-${project}`);
    member.on("dialog", (dialog) => void dialog.accept());
    await member.goto(`/groups/join/${code.trim()}`);
    await expect(member).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    // The bundle, from the paperclip. The price shows once the sales switch reaches
    // the app (it re-reads settings on a timer in a production build).
    await page.goto(groupUrl);
    await page
      .getByRole("navigation", { name: "Squad" })
      .getByRole("link", { name: "general", exact: true })
      .click();
    await expect(page).toHaveURL(/\/c\/[0-9a-f-]{36}$/);
    const chatUrl = page.url();
    const dialog = page.getByRole("dialog", { name: "Share a paper bundle" });
    await expect(async () => {
      await page.goto(chatUrl);
      await page.getByRole("button", { name: "Attach" }).click();
      await page.getByRole("button", { name: "Paper bundle" }).click();
      await expect(dialog.getByRole("radio", { name: "Paid" })).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 60_000, intervals: [2_000] });
    await dialog.getByLabel("Name").fill("LGS papers");
    await dialog.getByRole("checkbox", { name: "LGS 2021" }).click();
    await dialog.getByRole("radio", { name: "Paid" }).click();
    await dialog.getByLabel("Price in rupees").fill("299");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await dialog.getByRole("button", { name: "Share bundle" }).click();
    await expect(dialog).toBeHidden();

    // The member sees it in the chat, paid, its papers locked until bought.
    await member.goto(chatUrl);
    await member.getByRole("link", { name: "Open bundle" }).click();
    await expect(member).toHaveURL(/\/bundles\/[0-9a-f-]{36}$/);
    const bundleUrl = member.url();
    await expect(
      member.getByRole("heading", { level: 1, name: "LGS papers" }),
    ).toBeVisible();
    await expect(member.getByLabel("Locked")).toHaveCount(1);
    await member.getByRole("button", { name: "Buy · ₹299" }).click();
    await member.getByRole("button", { name: "Pay ₹299" }).click();
    // Paid: straight to Tests, where the bundle's papers wait.
    await expect(member).toHaveURL(/\/tests\?added=[0-9a-f-]{36}$/);
    await expect(
      member.getByRole("status").filter({ hasText: "is in your tests" }),
    ).toContainText("LGS papers is in your tests");
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);

    // Bought: a paper opens to sit, and its key shows after.
    await member
      .getByRole("list", { name: "Papers in LGS papers" })
      .getByRole("link", { name: /LGS 2021/ })
      .click();
    await expect(member).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    await member.getByRole("button", { name: "Start exam" }).click();
    await member.getByRole("button", { name: "Start now" }).click();
    if (isMobile) await member.getByRole("radio", { name: /^Sheet/ }).click();
    await member.getByRole("button", { name: "Question 1, option A" }).click();
    await member.getByRole("button", { name: "Question 2, option C" }).click();
    await member.getByRole("button", { name: "Submit", exact: true }).click();
    await member.getByRole("button", { name: "Submit sheet" }).click();
    await expect(member).toHaveURL(/\/result\/[0-9a-f-]{36}$/);
    await expect(member.locator("p", { hasText: "/ 4" })).toHaveText(
      /^0\.67\s*\/ 4$/,
    );
    await expect(
      member.getByText("Question 2: you marked C, key A. Wrong."),
    ).toBeVisible();

    // It's on the member's Tests page; the owner sees who has it.
    await member.goto("/tests");
    await expect(
      member.getByRole("link", { name: /LGS papers.*by/ }),
    ).toBeVisible();
    await page.goto(bundleUrl);
    await expect(page.getByText(/1 person has it/)).toBeVisible();
  });
});
