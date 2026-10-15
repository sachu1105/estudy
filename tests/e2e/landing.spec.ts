import { expect, test, type Page } from "@playwright/test";

const sections = [
  ["Features", "features"],
  ["How it works", "how-it-works"],
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
      "one pod at a time",
    );
    await expect(
      page.getByText("Free during launch. No card needed."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Free during launch, except mock tests from your own notes",
        { exact: true },
      ),
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

  test("the features rail scrolls to its later cards", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.locator("#features").scrollIntoViewIfNeeded();
    const rail = page.getByRole("region", { name: "Features" });
    await expect(
      rail.getByRole("heading", { name: "A pod for every subject" }),
    ).toBeInViewport();
    // Squads live here now, as cards, rather than in a section of their own.
    const squads = rail.getByRole("heading", { name: "Squads with channels" });
    // The card sits past the right edge of the track until the rail is scrolled.
    const left = async () => (await squads.boundingBox())?.x ?? 0;
    const start = await left();
    expect(start).toBeGreaterThan(page.viewportSize()?.width ?? 0);

    if (isMobile) {
      await squads.scrollIntoViewIfNeeded();
    } else {
      // The arrows page one card at a time; give each smooth scroll time to land.
      const next = page.getByRole("button", { name: "Next" });
      const width = page.viewportSize()?.width ?? 0;
      const onScreen = async () => {
        const box = await squads.boundingBox();
        return !!box && box.x >= 0 && box.x + box.width <= width;
      };
      for (let i = 0; i < 8 && !(await onScreen()); i++) {
        await next.click();
        await page.waitForTimeout(400);
      }
      // Reaching the arrows scrolled the page past the cards; bring them back.
      await squads.scrollIntoViewIfNeeded();
    }
    expect(await left()).toBeLessThan(start);
    await expect(squads).toBeInViewport();
  });

  test("get started goes to register", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get started free" }).first().click();
    await expect(page).toHaveURL(/\/register$/);
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
  // Someone already using studypods is never sent through a setup screen: every
  // landing CTA reads "Go to dashboard" and lands on Today.
  test("every CTA goes straight to the dashboard", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await openMenuIfMobile(page, isMobile);
    await expect(
      page.getByRole("link", { name: "Go to dashboard" }).first(),
    ).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Close" }).click();

    await expect(
      page.getByRole("link", { name: "Get started free" }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Go to dashboard" }).first().click();
    await expect(page).toHaveURL(/\/today$/);
  });
});
