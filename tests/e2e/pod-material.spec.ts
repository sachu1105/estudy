import { expect, test, type Page } from "@playwright/test";

import { makePdf } from "../support/pdf";

import { seedParsedDraft } from "./support/db";

async function podFromNewSyllabus(page: Page, title: string) {
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };
  const id = await seedParsedDraft(me.id, title);
  await page.goto(`/syllabus/${id}`);
  await page.getByRole("button", { name: "Confirm syllabus" }).click();
  // Confirming opens the exam pod; its subject pods are inside.
  await expect(page).toHaveURL(new RegExp(`/pods/exam/${id}$`));
  await page.getByRole("link", { name: /Indian Constitution/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Indian Constitution" }),
  ).toBeVisible();
}

test.describe("pod material", () => {
  test("notes, links and files, linked to topics, searchable, with a trash", async ({
    page,
  }) => {
    const run = `${test.info().project.name}${Date.now()}`;
    await podFromNewSyllabus(page, `Material ${run}`);

    // A note: written, autosaved, found again.
    await page.getByRole("tab", { name: "Material" }).click();
    await page.getByRole("button", { name: "Note" }).click();
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/);
    await page.getByLabel("Note title").fill(`Preamble notes ${run}`);
    await page.getByLabel("Note", { exact: true }).click();
    await page.keyboard.type(`Keyword zebra${run} and the sovereign republic.`);
    await expect(page.getByRole("status").getByText("Saved")).toBeVisible();
    await page.reload();
    await expect(page.getByText(`Keyword zebra${run}`)).toBeVisible();

    // Link it to a topic.
    await page.getByRole("button", { name: "Link to topics" }).click();
    await page
      .getByRole("dialog")
      .getByText("Preamble", { exact: true })
      .click();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("button", { name: "1 topic" })).toBeVisible();

    // Inside the topic: the note is there; a link and a PDF added here are linked too.
    await page.getByRole("link", { name: "Indian Constitution" }).click();
    await page.getByRole("link", { name: /^Preamble/ }).click();
    await expect(
      page.getByRole("link", { name: new RegExp(`Preamble notes ${run}`) }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Link", exact: true }).click();
    await page
      .getByLabel("Link", { exact: true })
      .fill("https://93.184.216.34/constitution");
    await page.getByRole("button", { name: "Add link" }).click();
    await expect(
      page.getByRole("link", { name: /93\.184\.216\.34/ }).first(),
    ).toBeVisible();

    await page.locator('input[type="file"]:not([capture])').setInputFiles({
      name: `bare-act-${run}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(
        makePdf([
          "Article 1: India, that is Bharat, shall be a Union of States.",
        ]),
      ),
    });
    await expect(
      page.getByRole("link", { name: new RegExp(`bare-act-${run}`) }),
    ).toBeVisible();

    // Search finds the note's words.
    await page.goto(`/pods/search?q=zebra${run}`);
    await expect(
      page.getByRole("link", { name: new RegExp(`Preamble notes ${run}`) }),
    ).toBeVisible();

    // Trash and restore.
    await page
      .getByRole("link", { name: new RegExp(`Preamble notes ${run}`) })
      .click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/pods\/[0-9a-f-]{36}$/);
    await page.goto("/pods/trash");
    const row = page
      .getByRole("listitem")
      .filter({ hasText: `Preamble notes ${run}` });
    await row.getByRole("button", { name: "Restore" }).click();
    await expect(row).toHaveCount(0);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
