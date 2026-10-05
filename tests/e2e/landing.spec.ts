import { expect, test, type Page } from "@playwright/test";

const sections = [
  ["Features", "features"],
  ["How it works", "how-it-works"],
  ["Groups", "groups"],
  ["Pricing", "pricing"],
  ["FAQ", "faq"],
] as const;

async function openMenuIfMobile(page: Page, isMobile: boolean) {
  if (!isMobile) return;
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
}

test.describe("landing, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("loads with the hero and one clear call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "daily plan you can actually finish",
    );
    await expect(
      page.getByText("Free during launch. No card needed."),
    ).toBeVisible();
    await expect(
      page.getByText("Every feature is free during launch", { exact: true }),
    ).toBeAttached();
  });

  test("every section link scrolls to its section", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    for (const [label, id] of sections) {
      await openMenuIfMobile(page, isMobile);
      const nav = isMobile
        ? page.getByRole("dialog", { name: "Menu" })
        : page.getByRole("banner");
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
      if (isMobile)
        await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    }
  });

  test("create your study plan goes to register, then onboarding", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: "Create your study plan" })
      .first()
      .click();
    await expect(page).toHaveURL(
      /\/register\?next=%2Fonboarding$|\/register\?next=\/onboarding$/,
    );
  });

  test("mobile menu opens and closes", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only exists under 1024px");
    await page.goto("/");
    await openMenuIfMobile(page, true);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
  });

  test("serves the SEO files", async ({ request, page }) => {
    for (const path of [
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
      "/apple-icon",
    ]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    await page.goto("/");
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const og = await request.get(
      new URL(ogImage ?? "").pathname + new URL(ogImage ?? "").search,
    );
    expect(og.headers()["content-type"]).toBe("image/png");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    const types = (JSON.parse(jsonLd ?? "[]") as { "@type": string }[]).map(
      (item) => item["@type"],
    );
    expect(types).toEqual(["SoftwareApplication", "FAQPage"]);
  });
});

test.describe("landing, signed in", () => {
  test("offers the dashboard and sends the CTA to onboarding", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await openMenuIfMobile(page, isMobile);
    await expect(
      page.getByRole("link", { name: "Go to dashboard" }).first(),
    ).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Close" }).click();

    await page
      .getByRole("link", { name: "Create your study plan" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/onboarding$/);
  });
});
