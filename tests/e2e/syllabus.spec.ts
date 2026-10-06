import { expect, test, type Page } from "@playwright/test";

import { seedParsedDraft } from "./support/db";

async function currentUserId(page: Page) {
  const response = await page.request.get("/api/me");
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

test.describe("syllabus", () => {
  test("pasting a syllabus starts a parse job with an honest status", async ({
    page,
  }) => {
    await page.goto("/syllabus/new");
    await page.getByRole("radio", { name: "Paste text" }).click();
    await page
      .getByLabel("Syllabus text")
      // Unique per run: identical text would reuse an earlier parse instantly (rule 4).
      .fill(
        `Part I General English (10 marks)\nTenses, articles, prepositions, active and passive voice\nRun ${test.info().project.name} ${Date.now()}`,
      );
    await page.getByLabel("Title").fill(`Pasted ${test.info().project.name}`);
    await page.getByRole("button", { name: "Read syllabus" }).click();

    await expect(page).toHaveURL(/\/syllabus\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("list", { name: "Progress" })).toBeVisible();
    // With a worker running it says it keeps going; without one, that the reader is offline.
    await expect(
      page
        .getByText("You can leave this page")
        .or(page.getByText("The syllabus reader is offline")),
    ).toBeVisible();

    // A way out: stop the reading and delete the upload.
    await page.getByRole("button", { name: "Stop and delete" }).click();
    await page.getByRole("button", { name: "Delete syllabus" }).click();
    await expect(page).toHaveURL(/\/pods$/);
    await expect(
      page.getByRole("link", {
        name: new RegExp(`Pasted ${test.info().project.name}`),
      }),
    ).toHaveCount(0);
  });

  test("a file over 15 MB is refused before uploading", async ({ page }) => {
    await page.goto("/syllabus/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "huge.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(15 * 1024 * 1024 + 1),
    });
    await expect(page.getByText(/This file is over 15 MB/)).toBeVisible();
  });

  test("subjects show as folders; topics are fixed inside a folder, then confirmed", async ({
    page,
  }) => {
    const title = `Review ${test.info().project.name} ${Date.now()}`;
    const id = await seedParsedDraft(await currentUserId(page), title);
    await page.goto(`/syllabus/${id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // One card per subject; no per-topic rating needed to get started.
    await expect(
      page.getByRole("heading", { name: "Indian Constitution" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kerala geography" }),
    ).toBeVisible();
    await expect(page.getByLabel(/^Weight of/)).toHaveCount(0);

    // Rename a subject from its card menu; it autosaves.
    await page
      .getByRole("button", { name: "More for Kerala geography" })
      .click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Geography of Kerala");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(
      page.getByRole("heading", { name: "Geography of Kerala" }),
    ).toBeVisible();
    await expect(page.getByRole("status").getByText("Saved")).toBeVisible();

    // Open a folder: its full topic list, with editing behind one button.
    await page.getByRole("link", { name: /Indian Constitution/ }).click();
    await expect(
      page.getByRole("heading", { name: "Indian Constitution", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Directive principles" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit topics" }).click();
    await page
      .getByRole("checkbox", { name: "Select Fundamental rights to merge" })
      .click();
    await page
      .getByRole("checkbox", { name: "Select Directive principles to merge" })
      .click();
    await page.getByRole("button", { name: "Merge 2 topics" }).click();
    await expect(page.getByLabel("Topic name")).toHaveCount(2);
    await expect(page.getByRole("status").getByText("Saved")).toBeVisible();
    await page.getByRole("button", { name: "Done editing" }).click();

    await page.reload(); // autosaved: nothing lost
    await expect(
      page.getByText("Fundamental rights, Directive principles"),
    ).toBeVisible();

    await page.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Confirm syllabus" }).click();
    // Confirmed: it's an exam pod now, with a pod per subject.
    await expect(page).toHaveURL(/\/pods\/exam\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("link", { name: /Geography of Kerala/ }),
    ).toBeVisible();

    await page.goto("/syllabus");
    await expect(
      page
        .getByRole("region", { name: "Your exams" })
        .getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
  });

  test("the catalogue lists the seeded exams and invites an upload", async ({
    page,
  }) => {
    await page.goto("/syllabus/catalogue");
    await expect(page.getByRole("heading", { name: "LD Clerk" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Combined Graduate Level" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Upload yours" }).first().click();
    await expect(page).toHaveURL(/\/syllabus\/new\?exam=/);
    await expect(page.getByLabel("Exam (optional)")).not.toHaveValue("");
  });

  test("someone else's syllabus is a 404", async ({ page }) => {
    const response = await page.goto(
      `/syllabus/00000000-0000-4000-8000-000000000000`,
    );
    expect(response?.status()).toBe(404);
  });
});
