/**
 * Screenshot helper for the UI/UX polish pass. Not part of the test suite.
 *
 *   pnpm tsx scripts/shots.ts /today /pods            # 360px, light
 *   pnpm tsx scripts/shots.ts --width 1366 /today     # desktop
 *   pnpm tsx scripts/shots.ts --dark /today
 *
 * Logs in once as SEED_ADMIN_EMAIL and caches the session, so repeated runs are fast.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import { chromium, type BrowserContext } from "@playwright/test";

config({ path: ".env", quiet: true });

const OUT =
  process.env.SHOTS_DIR ??
  path.join(
    process.env.TEMP ?? ".",
    "claude",
    "c--mm-projects-mine-ssp",
    "shots",
  );
const STATE = path.join(OUT, "auth.json");
const BASE = process.env.SHOTS_URL ?? "http://localhost:3000";

const args = process.argv.slice(2);
const routes: string[] = [];
let width = 360;
let height = 780;
let dark = false;
let full = true;
let label = "";
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--width") width = Number(args[++i]);
  else if (a === "--height") height = Number(args[++i]);
  else if (a === "--dark") dark = true;
  else if (a === "--viewport") full = false;
  else if (a === "--label") label = args[++i];
  else routes.push(a.startsWith("/") ? a : `/${a}`);
}
if (!routes.length) routes.push("/today");

function fileFor(route: string) {
  const slug =
    route === "/"
      ? "home"
      : route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "-");
  return path.join(
    OUT,
    `${slug}${label ? `-${label}` : ""}-${width}${dark ? "-dark" : ""}.png`,
  );
}

async function login(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  if (!page.url().includes("/login")) return page.close();
  await page.getByLabel("Email").fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/today/, { timeout: 30_000 });
  await context.storageState({ path: STATE });
  await page.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 768,
    hasTouch: width < 768,
    colorScheme: dark ? "dark" : "light",
    baseURL: BASE,
    storageState: existsSync(STATE) ? STATE : undefined,
  });
  await login(context);

  const page = await context.newPage();
  // Freeze motion so shots are stable, but keep the layout the animations settle into.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent =
        "*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important}";
      document.head.append(style);
    });
  });
  for (const route of routes) {
    await page.goto(route, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    const file = fileFor(route);
    await page.screenshot({ path: file, fullPage: full });
    console.log(
      `${route} -> ${file}${overflow > 0 ? `  !! side scroll ${overflow}px` : ""}`,
    );
  }
  // Keep the refreshed session: tokens rotate, so a stale file would be revoked.
  await context.storageState({ path: STATE });
  await browser.close();
}

main();
