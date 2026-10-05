import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shell/logo";

// Onboarding runs outside the app shell: one focused column, no navigation to wander off to.
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-4 md:px-8">
        <Link href="/" aria-label="Study planner home">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
