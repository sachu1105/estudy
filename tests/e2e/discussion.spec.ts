import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

const tab = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Group" }).getByRole("link", { name });

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

test.describe("group discussion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a question arrives live, gets an answer, and the answer is accepted", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const tag = `${test.info().project.name}${Date.now()}`;

    // The owner makes a group and an invite; a member joins.
    await seedAndLogin(page, `downer-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create group" }).click();
    await page.getByLabel("Name").fill(`Doubts ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create group" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Doubts ${tag}` }),
    ).toBeVisible();
    const groupUrl = page.url();
    await tab(page, "Members").click();
    await page.getByRole("button", { name: "New invite" }).click();
    const code = (await page
      .locator("li .font-mono")
      .first()
      .textContent())!.trim();

    const member = await person(browser, `dmember-${test.info().project.name}`);
    await member.goto(`/groups/join/${code}`);
    await expect(
      member.getByRole("heading", { level: 1, name: `Doubts ${tag}` }),
    ).toBeVisible();

    // The owner watches the discussion list.
    await page.goto(`${groupUrl}/discuss`);
    await expect(page.getByText("No posts yet")).toBeVisible();

    // The member asks, mentioning the owner by picking from the list.
    await member.goto(`${groupUrl}/discuss`);
    await member.getByRole("button", { name: "New post" }).click();
    await member.getByRole("radio", { name: "Question" }).click();
    await member
      .getByLabel("Title")
      .fill("Which article is the right to life?");
    const details = member.getByLabel("Details");
    await details.fill("Asking ");
    await details.pressSequentially("@Test");
    await member.getByRole("option", { name: "@Test Aspirant" }).click();
    await details.pressSequentially("is it **21**?");
    await member.getByRole("button", { name: "Post", exact: true }).click();
    await expect(member.getByText("Posted")).toBeVisible();
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);

    // It reaches the owner without a reload.
    const thread = page.getByRole("link", {
      name: /Which article is the right to life\?/,
    });
    await expect(thread).toBeVisible({ timeout: 15_000 });
    await thread.click();
    await expect(page.getByText("@Test Aspirant")).toBeVisible();
    await expect(page.getByText("21", { exact: true })).toBeVisible();

    // The member keeps the thread open; the owner answers.
    await member.goto(page.url());
    await page.getByLabel("Your answer").fill("Article 21, yes.");
    await page.getByRole("button", { name: "Send answer" }).click();
    await expect(member.getByText("Article 21, yes.")).toBeVisible({
      timeout: 15_000,
    });

    // The member finds it helpful and accepts it.
    const answer = member.getByRole("listitem").filter({
      hasText: "Article 21, yes.",
    });
    await answer.getByRole("button", { name: /^Helpful, 0$/ }).click();
    await expect(
      answer.getByRole("button", { name: /^Helpful, 1$/ }),
    ).toBeVisible();
    await answer.getByRole("button", { name: "Accept answer" }).click();
    await expect(
      member.getByText("Answer accepted. It earned 10 XP."),
    ).toBeVisible();
    await expect(answer.getByText("accepted")).toBeVisible();
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);

    // The owner was mentioned and had an answer accepted.
    await page.goto("/notifications");
    await expect(page.getByText(/mentioned you in/)).toBeVisible();
    await expect(page.getByText(/accepted your answer to/)).toBeVisible();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(
      page.getByRole("link", { name: "Notifications" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The owner hides the post; the member's list no longer shows it.
    await page.goBack();
    await page.goto(`${groupUrl}/discuss`);
    await page.getByRole("link", { name: /Which article/ }).click();
    await page
      .getByRole("button", { name: /^More for post Which article/ })
      .click();
    await page.getByRole("menuitem", { name: "Hide from members" }).click();
    // The post's badge, not the toast that says the same thing.
    await expect(
      page.getByText("hidden from members", { exact: true }),
    ).toBeVisible();
    await member.goto(`${groupUrl}/discuss`);
    await expect(member.getByText("No posts yet")).toBeVisible();
    await member.context().close();
  });
});
