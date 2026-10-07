import { expect, test } from "@playwright/test";

test.describe("drive-style shell", () => {
  test("keeps the page in its own scrolling panel on desktop", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "phones scroll the window");
    await page.goto("/today");
    await expect(page.locator("#panel")).toHaveCSS("overflow-y", "auto");
    await expect(page.getByRole("button", { name: "New" })).toHaveCount(0);
  });
});
