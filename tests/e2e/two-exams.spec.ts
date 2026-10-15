import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
import { seedParsedDraft } from "./support/db";

/**
 * An exam with a plan, built through the real setup. `expectShare` asserts the setup owns up
 * to sharing the day. Returns its syllabus id.
 */
async function examWithPlan(
  page: Page,
  title: string,
  expectShare = false,
  days?: 30 | 60,
) {
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };
  const id = await seedParsedDraft(me.id, title);
  await page.goto(`/syllabus/${id}`);
  await page.getByRole("button", { name: "Confirm syllabus" }).click();
  await expect(page).toHaveURL(new RegExp(`/pods/exam/${id}$`));
  await page.getByRole("button", { name: "Create study plan" }).click();
  if (days) await page.getByRole("button", { name: `${days} days` }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "2 h a day" }).click();
  if (expectShare) {
    // The Time step must say what this exam actually gets, not the whole day.
    await expect(page.getByText(/Split across your exams/)).toBeVisible();
  } else {
    await expect(page.getByText(/Split across your exams/)).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  if (expectShare) {
    await expect(page.getByText(/your share of/)).toBeVisible();
  }
  // Offered only when this exam is sat before the one leading the user's days.
  const offer = page.getByText("Make this exam my focus");
  if (days === 30) {
    await expect(offer).toBeVisible();
    await offer.click();
  }
  await page.getByRole("button", { name: "Build my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your plan is ready" }),
  ).toBeVisible();
  return id;
}

test.describe("two exams", () => {
  // Its own user: exams share one day, so this must not collide with other specs.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("share the day, hand over the focus, and pause without losing anything", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const suffix = `${test.info().project.name} ${Date.now()}`;
    await seedAndLogin(page, `two-exams-${test.info().project.name}`);

    const first = await examWithPlan(page, `First ${suffix}`);
    // One exam takes the whole day, so no share is mentioned.
    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText("% of your day")).toHaveCount(0);

    // Sat sooner than the first, so the review step offers it the lead and we take it.
    const second = await examWithPlan(page, `Second ${suffix}`, true, 30);

    // With two, each says what it gets, and exactly one leads.
    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText(/% of your day/)).toBeVisible();
    await page.goto(`/pods/exam/${second}`);
    await expect(page.getByText(/% of your day/)).toBeVisible();
    await page.goto("/pods");
    await expect(page.getByText("Focus", { exact: true })).toHaveCount(1);

    // The offer at review was taken, so the sooner exam leads.
    await page.goto(`/pods/exam/${second}`);
    await expect(page.getByText(/your focus/)).toBeVisible();
    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText(/your focus/)).toHaveCount(0);

    // And the lead hands back from the exam pod.
    await page.getByRole("button", { name: /^More for First/ }).click();
    await page.getByRole("menuitem", { name: "Make this my focus" }).click();
    await expect(page.getByText("is your focus now")).toBeVisible();
    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText(/your focus/)).toBeVisible();
    await page.goto(`/pods/exam/${second}`);
    await expect(page.getByText(/your focus/)).toHaveCount(0);
    await expect(page.getByText(/% of your day/)).toBeVisible();

    // Today leads with the focus exam and gathers the other below it.
    await page.goto("/today");
    await expect(page.getByText(`First ${suffix} · your focus`)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: `Second ${suffix}` }),
    ).toBeVisible();
    // The stats describe the focus exam, not an average of both.
    await expect(page.getByText(`Of First ${suffix}`)).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Rule 14: the share is explained, with the arithmetic, one click from the plan.
    await page.goto(`/pods/exam/${first}/plan`);
    // The plan's own facts line carries the share, beside the hours and the dates.
    await expect(page.getByText(/h planned · \d+% of your day/)).toBeVisible();
    await page.getByRole("link", { name: "How your plan was built" }).click();
    await expect(page.getByText(/share of your day/)).toBeVisible();
    await expect(
      page.getByText(/Your day is one day, however many exams/),
    ).toBeVisible();

    // Pause the first exam. Nothing is lost and nothing is overdue.
    await page.goto(`/pods/exam/${first}`);
    await page.getByRole("button", { name: /^More for First/ }).click();
    await page.getByRole("menuitem", { name: "Pause this exam" }).click();
    await expect(page.getByText(/Your time goes elsewhere/)).toBeVisible();

    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    // It is never offered a fresh plan as though it had none.
    await expect(
      page.getByRole("button", { name: "Create study plan" }),
    ).toHaveCount(0);

    await page.goto(`/pods/exam/${first}/plan`);
    await expect(
      page.getByRole("heading", { name: "This exam is paused" }),
    ).toBeVisible();
    // Rule 16: it has to fit a 360px phone, like every other screen.
    await page.setViewportSize({ width: 360, height: 740 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);

    // The exam left running has the whole day back, and Today stops sectioning.
    await page.goto(`/pods/exam/${second}`);
    await expect(page.getByText("% of your day")).toHaveCount(0);
    await page.goto("/today");
    await expect(page.getByText(/· your focus/)).toHaveCount(0);

    // And it comes back.
    await page.goto(`/pods/exam/${first}/plan`);
    await page.getByRole("button", { name: "Resume this exam" }).click();
    await expect(page.getByText("is back on")).toBeVisible();
    await page.goto(`/pods/exam/${first}`);
    await expect(page.getByText(/% of your day/)).toBeVisible();
  });
});
