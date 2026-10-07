import { expect, test, type Page } from "@playwright/test";

// CLAUDE.md rule 16: every screen fits a 360px phone with no horizontal scroll.
const publicRoutes = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/login",
  "/register",
  "/verify-email",
  "/reset-password",
  "/dev/ui",
];
const appRoutes = [
  "/today",
  "/pods?add=upload",
  "/syllabus/catalogue",
  "/pods",
  "/pods/search",
  "/pods/trash",
  "/tests",
  "/groups",
  "/settings",
  "/onboarding",
];

test.use({ viewport: { width: 360, height: 740 } });

async function expectNoSideScroll(page: Page, path: string) {
  await page.goto(path);
  // The URL ends up where we went: no redirect elsewhere (a query is matched as is).
  await expect(page).toHaveURL((url) =>
    path === "/"
      ? url.pathname === "/"
      : `${url.pathname}${url.search}`.startsWith(path),
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(
    overflow,
    `${path} scrolls sideways by ${overflow}px`,
  ).toBeLessThanOrEqual(0);
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  for (const path of publicRoutes) {
    test(`${path} fits 360px`, ({ page }) => expectNoSideScroll(page, path));
  }
});

test.describe("signed in", () => {
  for (const path of appRoutes) {
    test(`${path} fits 360px`, ({ page }) => expectNoSideScroll(page, path));
  }
});
