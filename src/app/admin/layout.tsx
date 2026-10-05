import { Shield } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/shell/logo";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/server/auth/session";

// The panel itself is milestone 12. MODERATOR+ may enter; pages narrow further.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("MODERATOR", "ADMIN", "SUPER_ADMIN");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoMark className="size-7" />
          <span className="font-heading font-semibold">Admin</span>
        </Link>
        <Badge tone="outline">
          <Shield aria-hidden /> Restricted
        </Badge>
      </header>
      <main className="w-full flex-1 px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
