import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

const squadLink = (page: Page, name: string | RegExp) =>
  page
    .getByRole("navigation", { name: "Squad" })
    .getByRole("link", { name, exact: typeof name === "string" });

async function open(page: Page, groupUrl: string, name: string) {
  await page.goto(groupUrl);
  await squadLink(page, name).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function person(browser: Browser, label: string) {
  const context = await browser.newContext({
    ...test.info().project.use,
    baseURL: "http://localhost:3000",
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedAndLogin(page, label);
  return page;
}

async function send(page: Page, text: string) {
  await page.getByRole("combobox", { name: "Message #general" }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

/** Opens one message's menu (on phones a tap on the message shows it). */
async function menuOf(page: Page, text: string) {
  const item = page.getByRole("listitem").filter({ hasText: text }).last();
  await item.getByText(text, { exact: true }).click();
  await item.getByRole("button", { name: /^More for the message/ }).click();
}

test.describe("squad chat", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("messages arrive live, with replies, reactions, edits and unread marks", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const project = test.info().project.name;
    const tag = `${project}${Date.now()}`;

    await seedAndLogin(page, `chat-owner-${project}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Chat ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    const groupUrl = page.url();
    await open(page, groupUrl, "Members");
    await page.getByRole("button", { name: "New invite" }).click();
    const code = (await page.locator("li .font-mono").first().textContent())!;

    const member = await person(browser, `chat-member-${project}`);
    await member.goto(`/groups/join/${code.trim()}`);
    await expect(member).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    await open(page, groupUrl, "general");
    await open(member, groupUrl, "general");
    await expect(page.getByText("This is the start of #general")).toBeVisible();
    if (project === "mobile")
      await expect(
        page.getByRole("navigation", { name: "Main" }),
      ).toBeHidden();

    // The member writes; the owner sees it without a reload.
    await send(member, "Hello squad");
    await expect(page.getByText("Hello squad")).toBeVisible({
      timeout: 15_000,
    });

    // The owner replies to it, and it reaches the member with what it answers.
    await menuOf(page, "Hello squad");
    await page.getByRole("menuitem", { name: "Reply" }).click();
    await expect(page.getByText("Replying to Test Aspirant")).toBeVisible();
    await send(page, "Welcome aboard");
    await expect(member.getByText("Welcome aboard")).toBeVisible({
      timeout: 15_000,
    });

    // The member says thanks; the owner edits their message.
    await menuOf(member, "Welcome aboard");
    await member.getByRole("menuitem", { name: "Thanks" }).click();
    await expect(member.getByRole("button", { name: "Thanks, 1" })).toBeVisible();
    await menuOf(page, "Welcome aboard");
    await page.getByRole("menuitem", { name: "Edit message" }).click();
    await page
      .getByRole("combobox", { name: "Message #general" })
      .fill("Welcome aboard, friend");
    await page.getByRole("button", { name: "Save edit" }).click();
    await expect(member.getByText("Welcome aboard, friend")).toBeVisible({
      timeout: 15_000,
    });
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Away from the chat, a new message marks the channel unread.
    await page.goto(groupUrl);
    await send(member, "Anyone up for a mock?");
    await expect(squadLink(page, /^general\s*, new messages/)).toBeVisible({
      timeout: 15_000,
    });
    await squadLink(page, /^general/).click();
    await expect(page.getByText("Anyone up for a mock?")).toBeVisible();
    await member.context().close();
  });
});
