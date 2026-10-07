import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shell/logo";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Link href="/" aria-label={`${site.name} home`} className="mb-12">
        <Logo />
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
