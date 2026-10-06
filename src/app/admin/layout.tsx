import { Shield } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/shell/logo";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toast";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { adminNav } from "@/lib/admin/access";
import { requireRole } from "@/server/auth/session";

// Staff only (rule 9). Each page narrows further with requireAdmin(area).
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("MODERATOR", "ADMIN", "SUPER_ADMIN");
  const items = adminNav(user.role).map(({ href, label }) => ({ href, label }));
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoMark className="size-7" />
          <span className="font-heading font-semibold">Admin</span>
        </Link>
        <Badge tone="outline">
          <Shield aria-hidden /> {user.role.replace("_", " ").toLowerCase()}
        </Badge>
        <Link
          href="/today"
          className="ml-auto text-small font-medium text-ink-muted hover:text-ink"
        >
          Back to the app
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-350 flex-1 flex-col gap-4 px-4 py-6 md:flex-row md:gap-8 md:px-6">
        <AdminNav items={items} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
