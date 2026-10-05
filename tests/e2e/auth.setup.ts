import { test as setup } from "@playwright/test";

import { registerVerifyAndLogin } from "./support/auth";

// One signed-in user shared by the app specs. Access tokens last 15 minutes, longer
// than a full run, so parallel workers never race on refresh-token rotation.
setup("sign in", async ({ page }) => {
  await registerVerifyAndLogin(page, "shared");
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
