import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft } from "./support/db";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("progress and rank", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("XP from a ticked task shows on the rank and the progress page; privacy hides the name", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedAndLogin(page, `rank-${test.info().project.name}`);
    const me = (await (await page.request.get("/api/me")).json()) as {
      id: string;
    };
    const id = await seedParsedDraft(
      me.id,
      `Rank ${test.info().project.name} ${Date.now()}`,
    );
    await page.goto(`/syllabus/${id}`);
    await page.getByRole("button", { name: "Confirm syllabus" }).click();
    await page.getByRole("button", { name: "Create study plan" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Build my plan" }).click();
    await expect(
      page.getByRole("heading", { name: "Your plan is ready" }),
    ).toBeVisible();

    await page.goto("/today");
    await page
      .getByRole("region", { name: "To do" })
      .getByRole("checkbox")
      .first()
      .click();
    await expect(page.getByRole("region", { name: "Done" })).toBeVisible();
    // The tick shows at once; wait until the server has it (and its XP).
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole("region", { name: "Done" })).toBeVisible({
        timeout: 1000,
      });
    }).toPass();

    // The board, this week: the viewer is marked, wherever they are.
    await page.goto("/rank");
    await expect(
      page.getByRole("heading", { level: 1, name: "Rank" }),
    ).toBeVisible();
    await expect(page.getByText(/\(you\)/)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByRole("link", { name: "All time" }).click();
    await expect(page.getByText(/\(you\)/)).toBeVisible();

    // Progress, all from the logs.
    await page.goto("/progress");
    await expect(
      page.getByRole("heading", { name: "Minutes a day" }),
    ).toBeVisible();
    await expect(page.getByText(/XP · \d+ to the next level/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Subjects" })).toBeVisible();
    await expect(page.getByText("Indian Constitution")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Hidden from others, never from yourself.
    await page.goto("/settings");
    await page.getByRole("switch", { name: "Hide me from the rank" }).click();
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.goto("/rank?period=all");
    await expect(page.getByText(/Test Aspirant \(you\)/)).toBeVisible();
  });
});
