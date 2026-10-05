import type { ReactNode } from "react";

import { BottomTabs } from "@/components/shell/bottom-tabs";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";

export default function ShellLayout({ children }: { children: ReactNode }) {
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
        <TopBar />
        <main
          id="main"
          className="mx-auto w-full max-w-content flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
