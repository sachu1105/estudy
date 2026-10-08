import type { ReactNode } from "react";

import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import { BottomTabs } from "@/components/shell/bottom-tabs";
import { MaintenancePage } from "@/components/shell/maintenance-page";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { Toaster } from "@/components/ui/toast";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/server/auth/session";
import { notificationService } from "@/server/services/notifications";
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
  const [{ announcement }, unread] = await Promise.all([
    loadSettings(),
    notificationService.unread(user),
  ]);
  const viewer = {
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    staff: user.role !== "USER",
    unread,
  };

  // Drive style on md+: the top bar and sidebar sit on the canvas, and the page lives in
  // a rounded panel that scrolls on its own. On phones it's one plain scrolling page.
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden md:bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopBar viewer={viewer} logout={logoutAction} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div
          id="panel"
          className="flex min-w-0 flex-1 flex-col md:mr-3 md:mb-3 md:[scrollbar-width:thin] md:overflow-y-auto md:rounded-[20px] md:border md:border-border md:bg-bg md:has-[[data-bleed]]:overflow-hidden"
        >
          {announcement?.active && announcement.text ? (
            <AnnouncementBanner
              text={announcement.text}
              tone={announcement.tone}
            />
          ) : null}
          <main
            id="main"
            // A page marked data-bleed (a squad's columns) fills the panel on md+ and
            // scrolls its own columns.
            className="mx-auto w-full max-w-content flex-1 px-4 pt-6 pb-24 has-[[data-focus-view]]:flex has-[[data-focus-view]]:flex-col has-[[data-focus-view]]:pb-0 md:px-8 md:pt-8 md:pb-12 md:has-[[data-bleed]]:min-h-0 md:has-[[data-bleed]]:max-w-none md:has-[[data-bleed]]:p-0"
          >
            {children}
          </main>
        </div>
      </div>
      <BottomTabs />
      <Toaster />
    </div>
  );
}
