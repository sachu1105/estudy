import type { ReactNode } from "react";

import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { hasSession } from "@/server/auth/session";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const signedIn = await hasSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <MarketingNav signedIn={signedIn} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter year={new Date().getFullYear()} />
    </div>
  );
}
