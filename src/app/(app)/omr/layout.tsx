import type { ReactNode } from "react";

import { MaintenancePage } from "@/components/shell/maintenance-page";
import { Toaster } from "@/components/ui/toast";
import { requireUser } from "@/server/auth/session";
import { maintenanceFor } from "@/server/settings/maintenance";

// A question paper beside its answer sheet: a full-screen focus view, no app shell.
export default async function OmrLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const maintenance = await maintenanceFor(user.role);
  if (maintenance !== null) return <MaintenancePage message={maintenance} />;
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
