// Removes e2e test accounts and their squads from the dev database:
//   pnpm tsx scripts/clean-test-data.ts
// Playwright also does this after every run (tests/e2e/global-teardown.ts).
import { removeTestAccounts } from "../tests/e2e/support/cleanup";

removeTestAccounts().then(
  (n) => console.log(`Removed ${n.users} test users and ${n.groups} squads.`),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
