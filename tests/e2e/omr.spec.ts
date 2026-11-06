import { readFile } from "node:fs/promises";

import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

async function expectPdf(download: Download) {
  expect(download.suggestedFilename()).toBe("LDC 2024 paper answer sheet.pdf");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
}

test.describe("question papers", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("upload a paper, mark the OMR sheet beside it, and the marks stay", async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90_000);
    // A reload during the exam gets the browser's "Leave site?"; say yes.
    page.on("dialog", (dialog) => void dialog.accept());
    await seedAndLogin(page, `omr-${test.info().project.name}`);

    await page.goto("/tests");
    await expect(page.getByText("No question papers yet")).toBeVisible();
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: "LDC 2024 paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        makePdf(["1. The longest river in Kerala?", "A) Periyar B) Pamba"]),
      ),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    // A fresh paper opens on the exam start; it can wait while you look around.
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "LDC 2024 paper" }),
    ).toBeVisible();

    // The paper is drawn in the page, on phones too.
    const page1 = page.getByRole("img", { name: "Page 1" });
    await expect(page1).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Beside the paper, the sheet can be made wider from the divider (keys work too).
    if (!isMobile) {
      const sheet = page.getByRole("region", { name: "OMR answer sheet" });
      const before = (await sheet.boundingBox())!.width;
      await page
        .getByRole("separator", { name: "Resize the answer sheet" })
        .focus();
      await page.keyboard.press("ArrowLeft");
      await expect
        .poll(async () => (await sheet.boundingBox())!.width)
        .toBeGreaterThan(before + 30);
      expect(
        await sheet.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(0);
    }

    // It can be made smaller than the pane, and the size is remembered.
    const fitWidth = (await page1.boundingBox())!.width;
    const zoomOut = page.getByRole("button", { name: "Zoom out" });
    await zoomOut.click();
    await zoomOut.click();
    await zoomOut.click();
    await expect(
      page.getByRole("button", { name: "Fit the page to the width" }),
    ).toHaveText("67%");
    await expect
      .poll(async () => (await page1.boundingBox())!.width)
      .toBeLessThan(fitWidth * 0.7);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Fit the page to the width" }),
    ).toHaveText("67%");
    await page
      .getByRole("button", { name: "Fit the page to the width" })
      .click();
    await expect(
      page.getByRole("button", { name: "Fit the page to the width" }),
    ).toHaveText("100%");

    // On a phone the sheet is one tap away; on a laptop it sits beside the paper.
    if (isMobile) await page.getByRole("radio", { name: /^Sheet/ }).click();
    const bubble = (q: number, o: string) =>
      page.getByRole("button", { name: `Question ${q}, option ${o}` });
    // The first tap asks for the timer, as in the exam; once it runs, the tap counts.
    await bubble(1, "B").click();
    await expect(
      page.getByText(/Start the clock to mark your first answer/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start exam" }).click();
    await expect(
      page.getByRole("dialog", { name: "Exam starting" }),
    ).toBeVisible();
    await expect(bubble(1, "B")).toHaveAttribute("aria-pressed", "true");
    await bubble(100, "D").click();
    // Marks are final by default, like pen on paper: another option leaves it as it is.
    await bubble(1, "C").click();
    await expect(page.getByText(/Question 1 is already marked/)).toBeVisible();
    await expect(bubble(1, "B")).toHaveAttribute("aria-pressed", "true");
    // Sheet settings let answers change, and pick the pen.
    await page.getByRole("button", { name: "Sheet settings" }).click();
    await page.getByRole("radio", { name: "Blue" }).click();
    await page.getByRole("switch", { name: "Marks are final" }).click();
    await page.keyboard.press("Escape");
    await bubble(1, "C").click();
    await expect(bubble(1, "C")).toHaveAttribute("aria-pressed", "true");
    await expect(bubble(1, "B")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByLabel("2 of 100 marked")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The marked sheet downloads as a PDF (the last taps are saved first).
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download the answer sheet as a PDF" })
      .click();
    await expectPdf(await download);

    // Marks save as you go. A reload leaves the sitting: the clock resets, the marks
    // stay, and the start card says why.
    await expect(page.getByRole("banner").getByRole("status")).toHaveText(
      "Saved",
    );
    await page.reload();
    await expect(
      page.getByText(/You left your last sitting, so its clock was reset/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    if (isMobile) await page.getByRole("radio", { name: /^Sheet/ }).click();
    await expect(bubble(100, "D")).toHaveAttribute("aria-pressed", "true");
    await expect(bubble(1, "C")).toHaveAttribute("aria-pressed", "true");

    // A new sitting starts on a clean sheet: the start card says the old answers go,
    // and only the tap that started it is marked.
    await bubble(2, "A").click();
    await expect(
      page.getByText(/Starting clears the 2 answers from your last sitting/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start exam" }).click();
    await page.getByRole("button", { name: "Start now" }).click();
    await expect(page.getByLabel("1 of 100 marked")).toBeVisible();
    await expect(bubble(2, "A")).toHaveAttribute("aria-pressed", "true");
    await expect(bubble(100, "D")).toHaveAttribute("aria-pressed", "false");

    // Leaving asks first, then lists the paper with its marks.
    await page.getByRole("link", { name: "Leave the exam" }).click();
    await page.getByRole("button", { name: "Leave and reset timer" }).click();
    await expect(page).toHaveURL(/\/tests$/);
    const papers = page.getByRole("list", { name: "Question papers" });
    await expect(
      papers.getByRole("link", { name: /LDC 2024 paper.*01\s*of 100 marked/ }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    // The paper's menu downloads it too.
    await page.getByRole("button", { name: "More for LDC 2024 paper" }).click();
    const fromMenu = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Download answer sheet" }).click();
    await expectPdf(await fromMenu);
    await page.getByRole("button", { name: "More for LDC 2024 paper" }).click();
    await page.getByRole("menuitem", { name: "Delete paper" }).click();
    await page.getByRole("button", { name: "Delete paper" }).click();
    await expect(page.getByText("No question papers yet")).toBeVisible();
  });

  test("the timer can't be paused, leaving asks first, it resets, and says when time's up", async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install();
    await seedAndLogin(page, `omr-timer-${test.info().project.name}`);
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: "Timed paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    const timer = page.getByRole("banner").getByRole("timer");
    const bubble = page.getByRole("button", { name: "Question 3, option A" });
    // The fake clock only moves the browser: let the server's start land before
    // fast-forwarding, or its reply rewinds the display.
    const startNow = async (button: Locator) => {
      await button.click();
      await expect(
        page.getByRole("button", { name: /Open timer/ }),
      ).not.toHaveAttribute("aria-busy", "true");
    };

    // The exam start opens by itself, with 75 minutes picked; then 3, 2, 1.
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Time limit" }).getByRole("button", {
        name: "75 min",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Start exam" }).click();
    const countdown = page.getByRole("dialog", { name: "Exam starting" });
    await expect(countdown).toBeVisible();
    await startNow(countdown.getByRole("button", { name: "Start now" }));
    await expect(countdown).toBeHidden();
    await expect(timer).toHaveText(/^1:1[45]:\d\d$/);
    await page.clock.fastForward("05:00");
    await expect(timer).toHaveText(/^1:(09|10):\d\d$/);

    // No pause: only a reset, and that asks first.
    await page.getByRole("button", { name: /Open timer/ }).click();
    await expect(page.getByRole("button", { name: /Pause/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Leaving, by the back arrow or the browser's back button, asks first.
    await page.getByRole("link", { name: "Leave the exam" }).click();
    await expect(
      page.getByRole("heading", { name: "Leave the exam?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stay in the exam" }).click();
    await page.goBack({ waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { name: "Leave the exam?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stay in the exam" }).click();
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    await expect(timer).toHaveText(/^1:(09|10):\d\d$/);

    await page.getByRole("button", { name: /Open timer/ }).click();
    await page.getByRole("button", { name: "Reset timer" }).click();
    await page.getByRole("button", { name: "Reset timer" }).click();
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Reset, the sheet asks for the timer again before a mark counts.
    if (isMobile) await page.getByRole("radio", { name: /^Sheet/ }).click();
    await bubble.click();
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    // Closed without starting, the tap doesn't count.
    await page.keyboard.press("Escape");
    await expect(bubble).toHaveAttribute("aria-pressed", "false");
    await bubble.click();
    await page.getByRole("button", { name: "Custom" }).click();
    await page.getByLabel("Minutes").fill("1");
    await page.getByRole("button", { name: "Start exam" }).click();
    await startNow(page.getByRole("button", { name: "Start now" }));
    await expect(bubble).toHaveAttribute("aria-pressed", "true");
    await expect(timer).toHaveText(/^0[01]:\d\d$/);
    await page.clock.fastForward("01:05");
    // Time's up: the sheet asks to be handed in, as the invigilator would.
    await expect(
      page.getByRole("heading", { name: "Time's up. Submit your sheet?" }),
    ).toBeVisible();
    await expect(
      page.getByText(/You marked 1 of 100, 99 left blank/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep answering" }).click();
    await expect(timer).toHaveText(/^\+00:\d\d$/);
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The browser's back button, confirmed, ends the sitting: next time it starts
    // fresh, with no note about a sitting left behind.
    await page.goBack({ waitUntil: "commit" });
    await page.getByRole("button", { name: "Leave and reset timer" }).click();
    await expect(page).toHaveURL(/\/tests$/);
    await page.getByRole("link", { name: /Timed paper/ }).click();
    await expect(
      page.getByRole("heading", { name: "Ready to start?" }),
    ).toBeVisible();
    await expect(page.getByText(/You left your last sitting/)).toHaveCount(0);
  });

  test("set the marking and the answer key, submit, and the score follows the key", async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90_000);
    await seedAndLogin(page, `omr-key-${test.info().project.name}`);
    await page.goto("/tests");
    await page.getByLabel("Question paper PDF").setInputFiles({
      name: "Key paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(makePdf(["1. A question"])),
    });
    await expect(page).toHaveURL(/\/omr\/[0-9a-f-]{36}$/);
    const paperUrl = page.url();
    const keyUrl = `${paperUrl}/key`;

    // The exam start says how it's marked and that there's no key yet.
    await expect(
      page.getByText(/100 questions · A–D · \+1 \/ −1\/3/),
    ).toBeVisible();
    await page.getByRole("link", { name: /Key and marking/ }).click();
    await expect(page).toHaveURL(keyUrl);
    await expect(
      page.getByRole("heading", { name: "Answer key and marking" }),
    ).toBeVisible();

    // Ten questions, PSC marking, a cut-off of 5.
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Questions").fill("10");
    await page.getByLabel("Cut-off").fill("5");
    await page.getByRole("button", { name: "Save marking" }).click();
    await expect(
      page.getByText(/10 questions, A–D · \+1 \/ −1\/3 · cut-off 5/),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The key, pasted in one go (X cancels question 10); question 2 accepts B or D.
    await page.getByLabel("Paste the key").fill("ABCD ABCD AX");
    await page.getByRole("button", { name: "Fill the key" }).click();
    await expect(page.getByText(/10 of 10\s+keyed/)).toBeVisible();
    const keyBubble = (q: number, o: string) =>
      page.getByRole("button", { name: `Question ${q}, option ${o} is right` });
    await expect(keyBubble(3, "C")).toHaveAttribute("aria-pressed", "true");
    await keyBubble(2, "D").click();
    await expect(keyBubble(2, "D")).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Question 10 is cancelled" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("radio", { name: "Official key" }).click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Saved",
    );
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Sit it: 1 A right, 2 D right (either answer), 3 A wrong, 4 D right, 10 cancelled.
    await page.goto(paperUrl);
    await expect(page.getByText("Answer key added")).toBeVisible();
    await page.getByRole("button", { name: "Start exam" }).click();
    await page.getByRole("button", { name: "Start now" }).click();
    if (isMobile) await page.getByRole("radio", { name: /^Sheet/ }).click();
    const bubble = (q: number, o: string) =>
      page.getByRole("button", { name: `Question ${q}, option ${o}` });
    for (const [q, o] of [
      [1, "A"],
      [2, "D"],
      [3, "A"],
      [4, "D"],
      [10, "B"],
    ] as const)
      await bubble(q, o).click();
    await expect(page.getByLabel("5 of 10 marked")).toBeVisible();
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(
      page.getByText(/You marked 5 of 10, 5 left blank/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Submit sheet" }).click();

    // 3 right + 1 cancelled (everyone gets it) − 1/3 for the wrong one = 3.67 of 10.
    await expect(page).toHaveURL(/\/result\/[0-9a-f-]{36}$/);
    const resultUrl = page.url();
    const scoreLine = page.locator("p", { hasText: "/ 10" });
    await expect(scoreLine).toHaveText(/^3\.67\s*\/ 10$/);
    await expect(
      page.getByText("1.33 short of the cut-off of 5"),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Wrong 1" }).click();
    await expect(
      page.getByText("Question 3: you marked A, key C. Wrong."),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The Tests page shows the last score.
    await page.goto("/tests");
    await expect(
      page.getByRole("link", { name: /Key paper.*3\.67\s*of 10, last score/ }),
    ).toBeVisible();

    // A corrected key corrects the result: question 3 now accepts A too.
    await page.goto(keyUrl);
    await keyBubble(3, "A").click();
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Saved",
    );
    await page.goto(resultUrl);
    await expect(scoreLine).toHaveText(/^5\s*\/ 10$/);
    await expect(page.getByText("Cleared the cut-off of 5")).toBeVisible();
  });

  test("someone else's paper is not found", async ({ page }) => {
    await seedAndLogin(page, `omr-other-${test.info().project.name}`);
    const response = await page.goto(
      "/omr/00000000-0000-4000-8000-000000000001",
    );
    expect(response?.status()).toBe(404);
    expect(
      (
        await page.request.get(
          "/api/omr/00000000-0000-4000-8000-000000000001/file",
        )
      ).status(),
    ).toBe(404);
    for (const path of ["key", "result/00000000-0000-4000-8000-000000000002"])
      expect(
        (
          await page.goto(`/omr/00000000-0000-4000-8000-000000000001/${path}`)
        )?.status(),
      ).toBe(404);
  });
});
