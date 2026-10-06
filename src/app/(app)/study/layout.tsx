import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toast";
import { MaintenancePage } from "@/components/shell/maintenance-page";
import { requireUser } from "@/server/auth/session";
import { maintenanceFor } from "@/server/settings/maintenance";

// The focus view: no navigation, one way out.
export default async function StudyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const maintenance = await maintenanceFor(user.role);
  if (maintenance !== null) return <MaintenancePage message={maintenance} />;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-end px-4 md:px-8">
        <Link
          href="/today"
          aria-label="Back to today"
          className="grid size-11 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-[max(32px,env(safe-area-inset-bottom))]">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
