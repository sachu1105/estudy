import { expect, test, type Page } from "@playwright/test";

import { seedParsedDraft } from "./support/db";

async function currentUserId(page: Page) {
  const response = await page.request.get("/api/me");
  return ((await response.json()) as { id: string }).id;
}

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("pods", () => {
  test("confirming a syllabus makes an exam pod with a pod per subject, and topics tick and stay ticked", async ({
    page,
  }) => {
    const title = `Pods ${test.info().project.name} ${Date.now()}`;
    const id = await seedParsedDraft(await currentUserId(page), title);
    await page.goto(`/syllabus/${id}`);
    await page.getByRole("button", { name: "Confirm syllabus" }).click();

    // Confirming opens the exam pod: the whole syllabus, its plan, its subjects.
    await expect(page).toHaveURL(new RegExp(`/pods/exam/${id}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Study plan" }),
    ).toBeVisible();
    await expect(page.getByText("0 of 4 topics done")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // A subject pod sits inside it.
    await page.getByRole("link", { name: /Indian Constitution/ }).click();
    await expect(page).toHaveURL(/\/pods\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Indian Constitution" }),
    ).toBeVisible();
    await expect(page.getByText("0 of 3 topics done")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.getByRole("checkbox", { name: "Preamble done" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Preamble done" }),
    ).toBeChecked();
    // Saved once the server's count catches up; then it survives a reload.
    await expect(page.getByText("1 of 3 topics done")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Preamble done" }),
    ).toBeChecked();
    await expect(page.getByText("1 of 3 topics done")).toBeVisible();

    // Back up to the exam pod, which counts the tick.
    await page.getByRole("link", { name: title }).first().click();
    await expect(page).toHaveURL(new RegExp(`/pods/exam/${id}$`));
    await expect(page.getByText("1 of 4 topics done")).toBeVisible();
    const column = (name: string) => page.getByRole("region", { name });
    await expect(
      column("To study")
        .getByRole("article")
        .filter({ hasText: "Indian Constitution" }),
    ).toContainText("1 of 3 topics");

    // The board: move a subject with its menu, and it stays moved.
    await page.getByRole("button", { name: "Move Kerala geography" }).click();
    const saved = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("menuitem", { name: "Studying" }).click();
    await saved;
    await expect(
      column("Studying").getByRole("link", { name: "Kerala geography" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      column("Studying").getByRole("link", { name: "Kerala geography" }),
    ).toBeVisible();

    // And by dragging, on desktop (a phone drags with a long press).
    if (!test.info().project.name.includes("mobile")) {
      const card = column("To study")
        .getByRole("article")
        .filter({ hasText: "Indian Constitution" });
      const target = column("Done").getByText("Drop a subject here");
      const from = (await card.boundingBox())!;
      const to = (await target.boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, from.y + 50);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 10, from.y + 60);
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
        steps: 12,
      });
      const dropped = page.waitForResponse(
        (r) => r.request().method() === "POST",
      );
      await page.mouse.up();
      await dropped;
      await expect(
        column("Done").getByRole("link", { name: "Indian Constitution" }),
      ).toBeVisible();
      await page.reload();
      await expect(
        column("Done").getByRole("link", { name: "Indian Constitution" }),
      ).toBeVisible();
    }
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // The pods home lists the exam.
    await page.getByRole("link", { name: "Pods", exact: true }).first().click();
    await expect(
      page
        .getByRole("region", { name: "Your exams" })
        .getByRole("link", { name: new RegExp(title) }),
    ).toContainText("1 of 4 topics done");
  });

  test("makes a pod of the user's own, renames it and deletes it", async ({
    page,
  }) => {
    const name = `Old papers ${test.info().project.name} ${Date.now()}`;
    await page.goto("/pods");
    await page.getByRole("button", { name: "New pod" }).click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Create pod" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    await page.getByRole("button", { name: `More for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Name", { exact: true }).fill(`${name} 2`);
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: `${name} 2` }),
    ).toBeVisible();

    await page.getByRole("button", { name: `More for ${name} 2` }).click();
    await page.getByRole("menuitem", { name: "Delete pod" }).click();
    await page.getByRole("button", { name: "Delete pod" }).click();
    await expect(page).toHaveURL(/\/pods$/);
    await expect(
      page.getByRole("link", { name: new RegExp(`${name} 2`) }),
    ).toHaveCount(0);
  });

  test("someone else's pod is a 404", async ({ page }) => {
    const response = await page.goto(
      "/pods/00000000-0000-4000-8000-000000000000",
    );
    expect(response?.status()).toBe(404);
  });
});
