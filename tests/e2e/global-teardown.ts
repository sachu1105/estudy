import { removeTestAccounts } from "./support/cleanup";

/** Leaves the dev database as it was: no test accounts or their squads. */
export default async function globalTeardown() {
  await removeTestAccounts();
}
