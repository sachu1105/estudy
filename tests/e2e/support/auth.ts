import { expect, type Page } from "@playwright/test";

import { seedVerifiedUser } from "./db";
import { tokenFromEmail, uniqueEmail } from "./mailpit";

export const PASSWORD = "e2e password 123";

/** Registers through the real UI, verifies via Mailpit and logs in. Returns the email. */
export async function registerVerifyAndLogin(page: Page, label: string) {
  const email = uniqueEmail(label);
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Test Aspirant");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox" }),
  ).toBeVisible();

  const token = await tokenFromEmail(email, "Verify your email");
  await page.goto(`/verify-email?token=${token}`);
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(
    page.getByText("Email verified. Log in to start your plan."),
  ).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/today$/);
  return email;
}

/** A fresh, verified user logged in on this page, without the rate-limited sign-up. */
export async function seedAndLogin(
  page: Page,
  label: string,
  role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" = "USER",
) {
  const email = uniqueEmail(label);
  await seedVerifiedUser(email, PASSWORD, role);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/today$/);
  return email;
}
