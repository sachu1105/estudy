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
    await expect(page.getByRole("img", { name: "Page 1" })).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

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
