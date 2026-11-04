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

/** The username Add friend shows as "Yours is @…". */
async function myHandle(page: Page) {
  await page.goto("/groups/friends?tab=add");
  const text = await page.getByText(/Yours is @/).textContent();
  return text!.match(/@([a-z0-9_]+)/)![1]!;
}

test.describe("friends", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("add by username, accept from Pending, then chat live", async ({
    page,
    browser,
  }) => {
    const project = test.info().project.name;
    await seedAndLogin(page, `friend-a-${project}`);
    const handle = await myHandle(page);

    const other = await person(browser, `friend-b-${project}`);
    await other.goto("/groups/friends?tab=add");
    expect(await noSideScroll(other)).toBeLessThanOrEqual(0);
    // Search finds them by username as it's typed; the note goes with the request.
    await other.getByLabel("Add a note (optional)").fill("Revise together?");
    await other.getByLabel("Name or username").fill(handle);
    const people = other.getByRole("list", { name: "People" });
    await people.getByRole("button", { name: /^Add / }).click();
    await expect(people.getByText("Requested")).toBeVisible();

    // The first person finds it under Pending, with the note, and says yes.
    await page.goto("/groups/friends?tab=pending");
    const received = page.getByRole("region", { name: "Received" });
    await expect(received.getByText("“Revise together?”")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await received.getByRole("button", { name: /^Accept / }).click();
    await expect(page.getByText(/are friends/)).toBeVisible();

    // The note opened their chat; a new message arrives without a reload.
    await page.goto("/groups/friends?tab=all");
    await page.getByRole("link", { name: /^Message / }).click();
    const messages = page.getByRole("list", { name: "Messages" });
    await expect(messages.getByText("Revise together?")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await other.goto("/groups/friends?tab=all");
    await other.getByRole("link", { name: /^Message / }).click();
    const box = other.getByRole("textbox", { name: /^Message / });
    await box.fill("Starting polity at 7");
    await other.getByRole("button", { name: "Send" }).click();
    await expect(messages.getByText("Starting polity at 7")).toBeVisible({
      timeout: 15_000,
    });
    await other.context().close();
  });
});
