import { expect, test, type Page } from "@playwright/test";

import { seedAndLogin } from "./support/auth";
import { seedParsedDraft, seedVerifiedUser } from "./support/db";
import { uniqueEmail } from "./support/mailpit";

const noSideScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("admin panel", () => {
  // Staff accounts of their own, so nothing here touches the shared user.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is closed to users, and admins can't reach super admin areas", async ({
    page,
  }) => {
    await seedAndLogin(page, `plain-${test.info().project.name}`);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/today$/);

    await page.context().clearCookies();
    await seedAndLogin(page, `admin-${test.info().project.name}`, "ADMIN");
    const response = await page.goto("/admin/plans");
    expect(response?.status()).toBe(404);
  });

  test("an admin finds a user, suspends and restores them, and it's all logged", async ({
    page,
  }) => {
    const target = uniqueEmail(`target-${test.info().project.name}`);
    await seedVerifiedUser(target, "a long password 123");
    await seedAndLogin(page, `staff-${test.info().project.name}`, "ADMIN");

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Active today")).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.goto(`/admin/users?q=${encodeURIComponent(target)}`);
    await page.getByRole("link", { name: new RegExp(target) }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: target }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Suspend" }).click();
    await page.getByLabel("Reason").fill("Posting spam links");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Suspend" })
      .click();
    await expect(page.getByText("Account suspended")).toBeVisible();
    await expect(page.getByText("suspended", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Restore account" }).click();
    await page.getByLabel("Reason").fill("Appeal accepted");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Restore" })
      .click();
    await expect(page.getByText("Account restored")).toBeVisible();

    await page.goto("/admin/audit?action=admin.user");
    await expect(page.getByText("admin.user.suspended").first()).toBeVisible();
    await expect(page.getByText("admin.user.active").first()).toBeVisible();
  });

  test("promotes an upload to the catalogue, reviews it side by side, approves it", async ({
    page,
  }) => {
    const title = `Official ${test.info().project.name} ${Date.now()}`;
    await seedAndLogin(page, `catalogue-${test.info().project.name}`, "ADMIN");
    const me = (await (await page.request.get("/api/me")).json()) as {
      id: string;
    };
    const id = await seedParsedDraft(me.id, title);
    await page.goto(`/syllabus/${id}`);
    await page.getByRole("button", { name: "Confirm syllabus" }).click();
    await expect(page).toHaveURL(/\/pods\/exam\//);

    await page.goto(`/admin/catalogue?q=${encodeURIComponent(title)}`);
    await page.getByRole("button", { name: `Promote ${title}` }).click();
    await page.getByRole("combobox", { name: "Exam" }).click();
    await page.getByRole("option").nth(1).click();
    await page.getByRole("button", { name: "Send for review" }).click();
    await expect(page).toHaveURL(/\/admin\/catalogue\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Subjects and topics" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Indian Constitution" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page).toHaveURL(/\/admin\/catalogue$/);
    await page.goto("/admin/catalogue?status=APPROVED");
    await expect(
      page.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
  });

  test("the super admin edits plans and shows a site banner", async ({
    page,
  }) => {
    await seedAndLogin(
      page,
      `super-${test.info().project.name}`,
      "SUPER_ADMIN",
    );
    await page.goto("/admin/plans");
    await expect(
      page.getByRole("heading", { level: 1, name: "Plans and limits" }),
    ).toBeVisible();
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    for (const path of [
      "/admin/settings",
      "/admin/jobs",
      "/admin/audit",
      "/admin/users",
      "/admin/catalogue",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noSideScroll(page), path).toBeLessThanOrEqual(0);
    }

    const text = `Notice ${test.info().project.name} ${Date.now()}`;
    await page.goto("/admin/settings");
    await page.getByRole("switch", { name: "Show the banner" }).click();
    await page.getByLabel("Text").fill(text);
    await page.getByRole("button", { name: "Save banner" }).click();
    await expect(page.getByText("Banner saved")).toBeVisible();
    await page.goto("/today");
    await expect(page.getByText(text)).toBeVisible();

    // Off again, so other specs never see it.
    await page.goto("/admin/settings");
    await page.getByRole("switch", { name: "Show the banner" }).click();
    await page.getByRole("button", { name: "Save banner" }).click();
    await expect(page.getByText("Banner saved")).toBeVisible();
  });
});
