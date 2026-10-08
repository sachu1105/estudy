import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft, seedQuestions } from "./support/db";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

/** A link in the squad's channel list (the app's own navigation has a "Tests" too). */
const tab = (page: Page, name: string | RegExp) =>
  page
    .getByRole("navigation", { name: "Squad" })
    .getByRole("link", { name, exact: typeof name === "string" });

/** A channel or page of the squad, by way of its channel list (on phones, the squad page). */
async function open(page: Page, groupUrl: string, name: string) {
  await page.goto(groupUrl);
  await tab(page, name).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** A second person, in a browser context of their own. */
async function person(browser: Browser, label: string, role?: "ADMIN") {
  const context = await browser.newContext({
    ...test.info().project.use,
    baseURL: "http://localhost:3000",
    // A fresh session: not the shared signed-in user.
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedAndLogin(page, label, role);
  return page;
}

test.describe("groups", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("create, invite by link, share material, mute, and a shared test", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedQuestions([
      "Preamble",
      "Fundamental rights",
      "Directive principles",
      "Rivers of Kerala",
    ]);

    // The owner, with an exam pod so they have topics to build a test from.
    await seedAndLogin(page, `gowner-${test.info().project.name}`);
    const me = (await (await page.request.get("/api/me")).json()) as {
      id: string;
    };
    const syllabus = await seedParsedDraft(me.id, `Group exam ${tag}`);
    await page.goto(`/syllabus/${syllabus}`);
    await page.getByRole("button", { name: "Confirm syllabus" }).click();
    await expect(page).toHaveURL(/\/pods\/exam\//);

    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Kollam circle ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Kollam circle ${tag}` }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    const groupUrl = page.url();

    await tab(page, "Members").click();
    await page.getByRole("button", { name: "New invite" }).click();
    const code = (await page
      .locator("li .font-mono")
      .first()
      .textContent())!.trim();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);

    // A member joins through the link and shares a website.
    const member = await person(browser, `gmember-${test.info().project.name}`);
    await member.goto(`/groups/join/${code}`);
    await expect(
      member.getByRole("heading", { level: 1, name: `Kollam circle ${tag}` }),
    ).toBeVisible();
    await open(member, groupUrl, "links");
    await member.getByRole("button", { name: "Add a link" }).click();
    await member
      .getByLabel("Link", { exact: true })
      .fill("https://93.184.216.34/preamble");
    await member.getByLabel("Title (optional)").fill("Preamble explained");
    await member.getByRole("button", { name: "Share link" }).click();
    await expect(
      member.getByRole("link", { name: /Preamble explained/ }),
    ).toBeVisible();
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);

    // The owner sees it, then mutes the member, who can then only read.
    await open(page, groupUrl, "links");
    await expect(
      page.getByRole("link", { name: /Preamble explained/ }),
    ).toBeVisible();
    await open(page, groupUrl, "Members");
    // The member's own menu (the header has the group's).
    await page.getByRole("button", { name: "More for Test Aspirant" }).click();
    await page.getByRole("menuitem", { name: "Mute for a day" }).click();
    await expect(page.getByText("Muted for a day")).toBeVisible();
    await member.reload();
    await expect(member.getByText(/muted you for now/)).toBeVisible();
    await expect(
      member.getByRole("button", { name: "Add a link" }),
    ).toHaveCount(0);

    // A shared test from the pool: built, taken, and on the results board.
    await open(page, groupUrl, "mock-tests");
    await page.getByRole("button", { name: "Build a test" }).click();
    await page
      .getByRole("dialog")
      .getByText("Preamble", { exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByText("Rivers of Kerala", { exact: true })
      .click();
    await page.getByRole("radio", { name: "10" }).click();
    await page.getByRole("radio", { name: "Untimed" }).click();
    await page.getByRole("button", { name: "Share test" }).click();
    await expect(page.getByText("Test shared with the squad")).toBeVisible();
    await page.getByRole("button", { name: "Take test" }).first().click();
    await expect(page).toHaveURL(/\/test\/[0-9a-f-]{36}$/);
    await page.keyboard.press("1");
    const total = Number(
      (await page.getByText(/^1 of \d+$/).textContent())!.split(" of ")[1],
    );
    for (let i = 1; i < total; i++) {
      await page.getByRole("button", { name: "Next" }).click();
      await page.keyboard.press("1");
    }
    await page.getByRole("button", { name: "Finish test" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}$/);

    await page.goto(`${groupUrl}/tests`);
    await page.getByRole("link", { name: "Results" }).first().click();
    await expect(page.getByText(/\(you\)/)).toBeVisible();
    await open(page, groupUrl, "Squad rank");
    await expect(page.getByText(/\(you\)/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await member.context().close();
  });

  test("a reported group goes to the admins, who can hide it", async ({
    page,
    browser,
  }) => {
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedAndLogin(page, `greporter-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Spam group ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await page.getByRole("button", { name: /^More for / }).click();
    await page.getByRole("menuitem", { name: "Report squad" }).click();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByText("Reported. Thank you.")).toBeVisible();

    const admin = await person(
      browser,
      `gadmin-${test.info().project.name}`,
      "ADMIN",
    );
    await admin.goto("/admin/reports");
    const entry = admin
      .getByRole("listitem")
      .filter({ hasText: `Group: Spam group ${tag}` });
    await expect(entry).toBeVisible();
    await entry.getByRole("button", { name: "Hide it" }).click();
    await expect(admin.getByText("Hidden")).toBeVisible();
    await expect(admin.getByText(`Group: Spam group ${tag}`)).toHaveCount(0);
    await admin.context().close();
  });

  test("a squad that asks: the asker answers its question, the owner lets them in", async ({
    page,
    browser,
  }) => {
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedAndLogin(page, `gasker-owner-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(`Ask first ${tag}`);
    await dialog.getByRole("radio", { name: /Study circle/ }).click();
    await dialog.getByRole("radio", { name: /Ask to join/ }).click();
    await dialog
      .getByLabel("Question for people who ask (optional)")
      .fill("Which exam are you writing?");
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await dialog.getByRole("button", { name: "Create squad" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Ask first ${tag}` }),
    ).toBeVisible();
    const groupUrl = page.url();

    const asker = await person(browser, `gasker-${test.info().project.name}`);
    await asker.goto(groupUrl);
    await asker.getByLabel("Which exam are you writing?").fill("Degree level");
    await asker.getByRole("button", { name: "Ask to join" }).click();
    await expect(asker.getByText("Request sent").first()).toBeVisible();
    expect(await noSideScroll(asker)).toBeLessThanOrEqual(0);

    await tab(page, "Members").click();
    await expect(page.getByText("Degree level")).toBeVisible();
    await page.getByRole("button", { name: "Let in" }).click();
    // The request leaves the list once they are in.
    await expect(page.getByText("Degree level")).toHaveCount(0);
    await asker.reload();
    await expect(tab(asker, "Members")).toBeVisible();
    await asker.context().close();
  });

  test("an admin adds a channel, edits it, and deletes it", async ({
    page,
  }) => {
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedAndLogin(page, `gchannels-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Channels ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    // Add a threads channel from the squad menu: it opens straight away.
    await page
      .getByRole("button", { name: `More for Channels ${tag}` })
      .click();
    await page.getByRole("menuitem", { name: "Add a channel" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Kind").click();
    await page.getByRole("option", { name: "Threads" }).click();
    await dialog.getByLabel("Name").fill("Kerala History");
    await expect(dialog.getByText("Shows as #kerala-history")).toBeVisible();
    await dialog.getByRole("button", { name: "Add channel" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "kerala-history" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Make it admins-only from its own settings.
    await page.getByRole("button", { name: "Channel settings" }).click();
    await page.getByRole("menuitem", { name: "Edit channel" }).click();
    await page.getByRole("radio", { name: "Admins only" }).click();
    await page.getByRole("button", { name: "Save channel" }).click();
    await expect(page.getByText("Admins post here")).toBeVisible();

    // Delete it: back to the squad, and it's gone from the list.
    await page.getByRole("button", { name: "Channel settings" }).click();
    await page.getByRole("menuitem", { name: "Delete channel" }).click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    await expect(tab(page, "kerala-history")).toHaveCount(0);
  });

  test("an open squad is found in Discover and joined; its admin then makes it invite only", async ({
    page,
    browser,
  }) => {
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedAndLogin(page, `gdiscover-owner-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Findable ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    const groupUrl = page.url();

    const finder = await person(
      browser,
      `gdiscover-${test.info().project.name}`,
    );
    await finder.goto(`/groups/discover?q=${encodeURIComponent(tag)}`);
    expect(await noSideScroll(finder)).toBeLessThanOrEqual(0);
    await finder.getByRole("button", { name: `Join Findable ${tag}` }).click();
    await expect(
      finder.getByRole("heading", { level: 1, name: `Findable ${tag}` }),
    ).toBeVisible();

    // The owner renames it and makes it invite only, from its settings.
    await page.goto(`${groupUrl}/settings`);
    await page.getByLabel("Name").fill(`Renamed ${tag}`);
    await page.getByRole("radio", { name: /Invite only/ }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Squad saved")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await finder.goto(`/groups/discover?q=${encodeURIComponent(tag)}`);
    await expect(finder.getByText("No squads match")).toBeVisible();
    await finder.context().close();
  });

  test("a private channel is hidden until the admin lets someone in", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const tag = `${test.info().project.name}${Date.now()}`;
    await seedAndLogin(page, `gprivate-owner-${test.info().project.name}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Private ${tag}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    const groupUrl = page.url();
    await open(page, groupUrl, "Members");
    await page.getByRole("button", { name: "New invite" }).click();
    const code = (await page.locator("li .font-mono").first().textContent())!;

    const member = await person(browser, `gprivate-${test.info().project.name}`);
    await member.goto(`/groups/join/${code.trim()}`);
    await expect(member).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    // A channel only picked people can see.
    await page.goto(groupUrl);
    await page.getByRole("button", { name: `More for Private ${tag}` }).click();
    await page.getByRole("menuitem", { name: "Add a channel" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("inner circle");
    await dialog.getByRole("radio", { name: /People you pick/ }).click();
    await dialog.getByRole("button", { name: "Add channel" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "inner-circle" }),
    ).toBeVisible();
    await expect(page.getByText("Private channel")).toBeVisible();

    await member.goto(groupUrl);
    await expect(tab(member, /^inner-circle/)).toHaveCount(0);

    // Let them in, and it shows up.
    await page.getByRole("button", { name: "Channel settings" }).click();
    await page.getByRole("menuitem", { name: "Who's let in" }).click();
    // Both seeded people are called Test Aspirant; the owner's box is already fixed on.
    await page
      .getByRole("dialog")
      .getByRole("checkbox", { name: "Test Aspirant", exact: true })
      .click();
    const box = page
      .getByRole("dialog")
      .getByRole("checkbox", { name: "Test Aspirant", exact: true });
    await expect(box).toBeChecked();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved who's let in")).toBeVisible();

    await member.reload();
    await expect(tab(member, /^inner-circle/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await member.context().close();
  });
});
