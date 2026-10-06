import "server-only";

import { loadSettings } from "./index";

/** The maintenance message when it applies to this user, else null. Staff are never blocked. */
export async function maintenanceFor(role: string) {
  const { maintenance } = await loadSettings();
  if (!maintenance?.on || role !== "USER") return null;
  return maintenance.message;
}
