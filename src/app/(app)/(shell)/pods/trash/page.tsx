import { ChevronLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RestoreButton } from "@/features/pods/components/restore-button";
import { requireUser } from "@/server/auth/session";
import { itemService, TRASH_DAYS } from "@/server/services/pods";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const user = await requireUser();
  const items = await itemService.listTrash(user);
  return (
    <>
      <Link
        href="/pods"
        className="mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden /> Pods
      </Link>
      <PageHeader
        title="Trash"
        description={`Deleted material stays here for ${TRASH_DAYS} days, then it is gone for good.`}
      />
      {items.length === 0 ? (
        <EmptyState icon={Trash2} title="The trash is empty" />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {item.title}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {item.pod.name}
                </span>
              </span>
              <RestoreButton itemId={item.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
