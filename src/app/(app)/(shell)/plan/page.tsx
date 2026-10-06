import { ChevronRight, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDay } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

export const metadata: Metadata = { title: "Plan" };

/** Every active plan; with just one, the tab opens it. */
export default async function PlansPage() {
  const user = await requireUser();
  const plans = await planService.listActive(user);
  if (plans.length === 1) redirect(`/plan/${plans[0]!.id}`);
  return (
    <>
      <PageHeader title="Plan" description="Your study plans, one per exam." />
      {plans.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No study plan yet"
          description="Open an exam pod and create one. It's built from your subjects, your time and your exam date."
          action={
            <Button asChild variant="primary">
              <Link href="/pods">Go to your pods</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plan/${p.id}`}
                className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface p-4 hover:shadow-md"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-heading text-h3 font-medium">
                    {p.title}
                  </span>
                  <span className="text-small text-ink-muted">
                    Until {formatDay(p.endDate)} ·{" "}
                    {Math.round(p.plannedMinutes / 60)} hours
                  </span>
                </span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
