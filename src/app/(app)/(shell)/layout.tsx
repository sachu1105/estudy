import type { ReactNode } from "react";

import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import { BottomTabs } from "@/components/shell/bottom-tabs";
import { MaintenancePage } from "@/components/shell/maintenance-page";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { Toaster } from "@/components/ui/toast";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/server/auth/session";
import { loadSettings } from "@/server/settings";
import { maintenanceFor } from "@/server/settings/maintenance";

export default async function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const maintenance = await maintenanceFor(user.role);
  if (maintenance !== null) return <MaintenancePage message={maintenance} />;
  const { announcement } = await loadSettings();
  const viewer = {
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    staff: user.role !== "USER",
  };

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar viewer={viewer} logout={logoutAction} />
        {announcement?.active && announcement.text ? (
          <AnnouncementBanner
            text={announcement.text}
            tone={announcement.tone}
          />
        ) : null}
        <main
          id="main"
          className="mx-auto w-full max-w-content flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomTabs />
      <Toaster />
    </div>
  );
}
