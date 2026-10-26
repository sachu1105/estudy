import { expect, test, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("question papers", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("upload a paper, mark the OMR sheet beside it, and the marks stay", async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(90_000);
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
    await expect(
      page.getByRole("heading", { name: "LDC 2024 paper" }),
    ).toBeVisible();

    // The paper is drawn in the page, on phones too.
    const page1 = page.getByRole("img", { name: "Page 1" });
    await expect(page1).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

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
      page.getByRole("button", { name: "Fit the page to the width" }),
    ).toHaveText("67%");
    await page
      .getByRole("button", { name: "Fit the page to the width" })
      .click();
    await expect(
      page.getByRole("button", { name: "Fit the page to the width" }),
    ).toHaveText("100%");

    // On a phone the sheet is one tap away; on a laptop it sits beside the paper.
    if (isMobile)
      await page.getByRole("radio", { name: /Answer sheet/ }).click();
    const bubble = (q: number, o: string) =>
      page.getByRole("button", { name: `Question ${q}, option ${o}` });
    await bubble(1, "B").click();
    await bubble(100, "D").click();
    await bubble(1, "C").click();
    await expect(bubble(1, "C")).toHaveAttribute("aria-pressed", "true");
    await expect(bubble(1, "B")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByLabel("2 of 100 marked")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Marks save as you go and come back after a reload.
    await expect(page.getByRole("banner").getByRole("status")).toHaveText(
      "Saved",
    );
    await page.reload();
    if (isMobile)
      await page.getByRole("radio", { name: /Answer sheet/ }).click();
    await expect(bubble(100, "D")).toHaveAttribute("aria-pressed", "true");
    await expect(bubble(1, "C")).toHaveAttribute("aria-pressed", "true");

    // Tapping a marked bubble rubs it out.
    await bubble(1, "C").click();
    await expect(page.getByLabel("1 of 100 marked")).toBeVisible();

    // The list shows it; a paper can be deleted with its marks.
    await page.getByRole("link", { name: /Back to tests/ }).click();
    const papers = page.getByRole("list", { name: "Question papers" });
    await expect(papers.getByText("LDC 2024 paper")).toBeVisible();
    await expect(papers.getByText(/1\/100\s+marked/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "More for LDC 2024 paper" }).click();
    await page.getByRole("menuitem", { name: "Delete paper" }).click();
    await page.getByRole("button", { name: "Delete paper" }).click();
    await expect(page.getByText("No question papers yet")).toBeVisible();
  });

  test("a timer counts down, pauses across a reload, and says when time's up", async ({
    page,
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

    // 75 minutes is picked to start with.
    await page.getByRole("button", { name: "Start a timer" }).click();
    await expect(
      page.getByRole("group", { name: "Time limit" }).getByRole("button", {
        name: "75 min",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(timer).toHaveText(/^1:1[45]:\d\d$/);
    await page.clock.fastForward("05:00");
    await expect(timer).toHaveText(/^1:(09|10):\d\d$/);

    // Paused, it stays put, even after a reload. (The fake clock only moves the
    // browser; the pause takes the server's reading, so wait for it.)
    await page.getByRole("button", { name: /Open timer controls/ }).click();
    const answered = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/omr/"),
    );
    await page.getByRole("button", { name: "Pause" }).click();
    await answered;
    await expect(page.getByRole("button", { name: "Resume" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: /paused\. Open timer controls/ }),
    ).toBeVisible();
    const paused = await timer.textContent();
    await page.reload();
    await expect(timer).toHaveText(paused!);

    // Reset, then a one-minute countdown runs out.
    await page.getByRole("button", { name: /Open timer controls/ }).click();
    await page.getByRole("button", { name: "Reset timer" }).click();
    await expect(
      page.getByRole("heading", { name: "Set a timer" }),
    ).toBeVisible();
    await page.getByLabel("Or your own, in minutes").fill("1");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(timer).toHaveText(/^0[01]:\d\d$/);
    await page.clock.fastForward("01:05");
    await expect(
      page.getByText("Time's up. You marked 0 of 100."),
    ).toBeVisible();
    await expect(timer).toHaveText(/^\+00:\d\d$/);
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
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
  });
});
