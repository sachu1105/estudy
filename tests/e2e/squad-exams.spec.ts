import { expect, test, type Browser, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

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

/** The squad's #general chat, from the channel list. */
async function general(page: Page, groupUrl: string) {
  await page.goto(groupUrl);
  await page
    .getByRole("navigation", { name: "Squad" })
    .getByRole("link", { name: "general", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "general" }),
  ).toBeVisible();
}

test.describe("squad exams", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a teacher shares a paper as an exam; a student sits it once, and the rank list follows the results time", async ({
    page,
    browser,
    isMobile,
  }) => {
    test.setTimeout(180_000);
    const project = test.info().project.name;
    // A reload during the exam gets the browser's "Leave site?"; say yes.
    page.on("dialog", (dialog) => void dialog.accept());

    // The teacher's paper: 4 questions, key A A A A, PSC marking, cut-off 2.
    await seedAndLogin(page, `exam-teacher-${project}`);
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: "Police constable 2022.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    const paperUrl = page.url();
    await page.goto(`${paperUrl}/key`);
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Questions").fill("4");
    await page.getByLabel("Cut-off").fill("2");
    await page.getByRole("button", { name: "Save marking" }).click();
    await expect(page.getByText(/4 questions, A–D/)).toBeVisible();
    await page.getByLabel("Paste the key").fill("AAAA");
    await page.getByRole("button", { name: "Fill the key" }).click();
    await page.getByRole("radio", { name: "Official key" }).click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Saved",
    );

    // A squad with a student in it.
    await page.goto("/groups");
    await page.getByRole("button", { name: "Create squad" }).click();
    await page.getByLabel("Name").fill(`Exams ${project}${Date.now()}`);
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
    const student = await person(browser, `exam-student-${project}`);
    student.on("dialog", (dialog) => void dialog.accept());
    await student.goto(`/groups/join/${code.trim()}`);
    await expect(student).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

    // Shared from the paperclip: never closes, results at a later time, no names.
    await general(page, groupUrl);
    const chatUrl = page.url();
    await page.getByRole("button", { name: "Attach" }).click();
    await page.getByRole("button", { name: "Question paper" }).click();
    const share = page.getByRole("dialog", { name: "Share a question paper" });
    await share.getByRole("button", { name: /Police constable 2022/ }).click();
    await share.getByRole("radio", { name: "Never" }).click();
    await share
      .getByRole("group", { name: "Results" })
      .getByRole("radio", { name: "At a time" })
      .click();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await share.getByRole("button", { name: "Share exam" }).click();
    await expect(share).toBeHidden();

    // The student opens it from the chat and starts: one sitting, a register number.
    await student.goto(chatUrl);
    await student.getByRole("link", { name: "Open exam" }).click();
    await expect(student).toHaveURL(/\/exams\/[0-9a-f-]{36}$/);
    const examUrl = student.url();
    await student.getByRole("link", { name: "Start exam" }).click();
    await expect(student).toHaveURL(/\/omr\/[0-9a-f-]{36}\?exam=/);
    await expect(
      student.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await expect(student.getByText("One sitting")).toBeVisible();
    // A student never sees the way to the key.
    await expect(
      student.getByRole("link", { name: /Key and marking/ }),
    ).toHaveCount(0);
    await student.getByRole("button", { name: "Start exam" }).click();
    await student.getByRole("button", { name: "Start now" }).click();
    if (isMobile) await student.getByRole("radio", { name: /^Sheet/ }).click();
    const bubble = (q: number, o: string) =>
      student.getByRole("button", { name: `Question ${q}, option ${o}` });
    await bubble(1, "A").click();
    await bubble(2, "A").click();
    await bubble(3, "B").click();
    await expect(student.getByLabel("3 of 4 marked")).toBeVisible();

    // Leaving doesn't stop the clock; coming back carries on, marks and all.
    await student.getByRole("link", { name: "Leave the exam" }).click();
    await student.getByRole("button", { name: "Leave, clock running" }).click();
    await expect(student).toHaveURL(/\/tests$/);
    await expect(student.getByText(/your clock is running/)).toBeVisible();
    await student.goto(examUrl);
    await student.getByRole("link", { name: "Continue exam" }).click();
    await expect(student).toHaveURL(/\?exam=/);
    if (isMobile) await student.getByRole("radio", { name: /^Sheet/ }).click();
    await expect(bubble(3, "B")).toHaveAttribute("aria-pressed", "true");
    await expect(
      student.getByRole("heading", { name: "Ready to start?" }),
    ).toHaveCount(0);
    await student.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(
      student.getByText(/one sitting for the rank list/),
    ).toBeVisible();
    await student.getByRole("button", { name: "Submit sheet" }).click();

    // Handed in: a register number, and nothing about the score until results.
    await expect(student).toHaveURL(examUrl);
    await expect(student.getByText("1001", { exact: true })).toBeVisible();
    await expect(
      student.getByText(/Handed in\. Your score and the key/),
    ).toBeVisible();
    await expect(student.getByText(/The rank list comes out/)).toBeVisible();
    expect(await noSideScroll(student)).toBeLessThanOrEqual(0);
    const key = await student.goto(`${paperUrl}/key`);
    expect(key?.status()).toBe(404);

    // The teacher sees the list with names, and publishes the results now.
    await page.goto(examUrl);
    await expect(page.getByRole("list", { name: "Results" })).toContainText(
      "1001",
    );
    await page.getByRole("button", { name: "Publish results now" }).click();
    await expect(page.getByText("Results are out")).toBeVisible();

    // 2 right − 1/3 = 1.67 of 4, short of the cut-off; the list shows numbers, not names.
    await student.goto(examUrl);
    await expect(student.getByText("Results are out")).toBeVisible();
    const results = student.getByRole("list", { name: "Results" });
    await expect(results).toContainText("1001");
    await expect(results).toContainText("You");
    await expect(results).toContainText("1.67");
    // The smallest phone the app is built for: nothing scrolls sideways.
    if (isMobile) {
      await student.setViewportSize({ width: 360, height: 780 });
      expect(await noSideScroll(student)).toBeLessThanOrEqual(0);
    }
    await student.getByLabel("Find a register number").fill("1002");
    await expect(student.getByText("No result for 1002.")).toBeVisible();
    await student.getByRole("link", { name: "Your answers" }).click();
    await expect(student.locator("p", { hasText: "/ 4" })).toHaveText(
      /^1\.67\s*\/ 4$/,
    );
    await expect(
      student.getByText("Question 3: you marked B, key A. Wrong."),
    ).toBeVisible();
    expect(await noSideScroll(student)).toBeLessThanOrEqual(0);
  });
});
