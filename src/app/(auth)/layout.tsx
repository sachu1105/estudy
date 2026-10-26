import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <Button
        asChild
        variant="ghost"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))]"
      >
        <Link href="/">
          <ArrowLeft aria-hidden />
          Home
        </Link>
      </Button>
      <Link
        href="/"
        aria-label={`${site.name} home`}
        className="mb-10 -translate-x-2"
      >
        <Logo />
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
