import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft, seedQuestions } from "./support/db";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

/** A tab of the group (the app's own navigation has a "Tests" too). */
const tab = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Squad" }).getByRole("link", { name });

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
    await tab(page, "Material").click();
    await expect(
      page.getByRole("link", { name: /Preamble explained/ }),
    ).toBeVisible();
    await tab(page, "Members").click();
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
    await tab(page, "Tests").click();
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
    await tab(page, "Rank").click();
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
});
