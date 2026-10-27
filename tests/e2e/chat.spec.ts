import { expect, test, type Browser, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";
import { seedPodLink } from "./support/db";

/** A 1x1 PNG: real image bytes, so the server's check lets it through. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

  test("an invite link in a message asks to join right there, in the same tab", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const project = test.info().project.name;
    const tag = `${project}${Date.now()}`;
    await seedAndLogin(page, `invite-owner-${project}`);

    const create = async (name: string) => {
      await page.goto("/groups");
      await page.getByRole("button", { name: "Create squad" }).click();
      await page.getByLabel("Name").fill(name);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Create squad" })
        .click();
      await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
      const url = page.url();
      await open(page, url, "Members");
      await page.getByRole("button", { name: "New invite" }).click();
      const code = (await page.locator("li .font-mono").first().textContent())!;
      return { url, code: code.trim() };
    };
    const lobby = await create(`Lobby ${tag}`);
    const cpo = await create(`CPO ${tag}`);

    const member = await person(browser, `invite-member-${project}`);
    await member.goto(`/groups/join/${lobby.code}`);
    await expect(member).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    // An invite to this same app, wherever the run points it.
    const invite = `${new URL(lobby.url).origin}/groups/join/${cpo.code}`;
    await open(page, lobby.url, "general");
    await send(page, `${invite} join this one`);

    await open(member, lobby.url, "general");
    await member.getByRole("link", { name: invite }).click();
    const dialog = member.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: `Join CPO ${tag}?` }),
    ).toBeVisible();
    await expect(dialog.getByText("1 member")).toBeVisible();
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);
    await dialog.getByRole("button", { name: "Join squad" }).click();

    await expect(member).toHaveURL(cpo.url);
    expect(member.context().pages()).toHaveLength(1);
  });

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
      await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

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
    await expect(
      member.getByRole("button", { name: "Thanks, 1" }),
    ).toBeVisible();
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

    // Attach a link from the member's pod: picked from a list, sent as a card.
    const me = (await (await member.request.get("/api/me")).json()) as {
      id: string;
    };
    await seedPodLink(me.id, "Kerala history", `Travancore notes ${tag}`);
    await member.reload();
    await member.getByRole("button", { name: "Attach from my pods" }).click();
    await member
      .getByRole("button", { name: new RegExp(`Travancore notes ${tag}`) })
      .click();
    await member.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByRole("link", { name: `Travancore notes ${tag}` }),
    ).toBeVisible({ timeout: 15_000 });
    expect(await noSideScroll(member)).toBeLessThanOrEqual(0);

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

  test("photos and a PDF go straight from the device, and search jumps to a message", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const project = test.info().project.name;
    await seedAndLogin(page, `chat-files-${project}`);
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Files ${project}${Date.now()}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create squad" })
      .click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    await open(page, page.url(), "general");

    // Two photos and a line about them: one message, the photos drawn in the chat.
    const files = page.locator("input[data-chat-files]");
    await files.setInputFiles([
      { name: "page-1.png", mimeType: "image/png", buffer: PNG },
      { name: "page-2.png", mimeType: "image/png", buffer: PNG },
    ]);
    await expect(
      page.getByRole("button", { name: "Remove page-1.png" }),
    ).toBeVisible();
    await send(page, "Both pages of the Preamble");
    const photos = page.getByRole("link", { name: "2 photos" });
    await expect(photos).toBeVisible({ timeout: 15_000 });
    // Each photo loads through the squad's file route.
    await expect
      .poll(() =>
        photos
          .locator("img")
          .evaluateAll((imgs) =>
            imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);

    // A PDF on its own, sent with no words: a card named after the file.
    await files.setInputFiles({
      name: "Constitution notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["Article 21"])),
    });
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByRole("link", { name: "Constitution notes" }),
    ).toBeVisible({ timeout: 15_000 });
    // A PDF can't ride along with photos.
    await files.setInputFiles([
      {
        name: "a.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(makePdf(["x"])),
      },
      { name: "b.png", mimeType: "image/png", buffer: PNG },
    ]);
    await expect(
      page.getByText("Send a PDF on its own, one per message."),
    ).toBeVisible();

    for (const line of ["Fundamental rights next", "Mock at 7"])
      await send(page, line);
    await expect(page.getByText("Mock at 7")).toBeVisible();

    // Search: every word must match, in the words or in a file's name.
    await page.getByRole("button", { name: "Search #general" }).click();
    const panel = page.getByRole("dialog", { name: "Search #general" });
    await panel.getByRole("searchbox").fill("constitution");
    await expect(panel.getByRole("link")).toHaveCount(1);
    await panel.getByRole("searchbox").fill("preamble pages");
    const hit = panel.getByRole("link", { name: /Both pages of the Preamble/ });
    await expect(hit).toBeVisible();
    await expect(panel.locator("mark")).toHaveText(["pages", "Preamble"]);
    await hit.click();
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/#m-[0-9a-f-]{36}$/);
    const id = new URL(page.url()).hash.slice(1);
    await expect(page.locator(`li#${id}`)).toHaveClass(/bg-accent-soft/);
    await expect(page.locator(`li#${id}`)).toBeInViewport();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });
});
