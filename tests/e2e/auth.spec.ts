import { expect, test } from "@playwright/test";

import { PASSWORD, registerVerifyAndLogin } from "./support/auth";
import { tokenFromEmail } from "./support/mailpit";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("auth", () => {
  test("protected pages redirect to login with a return path", async ({
    page,
  }) => {
    await page.goto("/plan");
    await expect(page).toHaveURL(/\/login\?next=%2Fplan$/);
  });

  test("register -> verify -> login -> logout", async ({ page }) => {
    await registerVerifyAndLogin(page, "flow");
    await expect(
      page.getByRole("heading", { level: 1, name: "Today" }),
    ).toBeVisible();

    // Signed-in users skip the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/today$/);

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a wrong password shows a clear error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password", { exact: true }).fill("not the password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("That email and password don't match"),
    ).toBeVisible();
  });

  test("fields are validated before submitting", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  });

  test("forgot password -> reset -> old password stops working", async ({
    page,
  }) => {
    const email = await registerVerifyAndLogin(page, "reset");
    await page.context().clearCookies();

    await page.goto("/reset-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText(
      "reset link is on its way",
    );

    const token = await tokenFromEmail(email, "Reset your password");
    await page.goto(`/reset-password?token=${token}`);
    await page
      .getByLabel("New password", { exact: true })
      .fill("brand new password 9");
    await page.getByLabel("Confirm new password").fill("brand new password 9");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Password changed.")).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("That email and password don't match"),
    ).toBeVisible();
  });
});
