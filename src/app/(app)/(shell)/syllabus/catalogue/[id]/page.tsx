import { ArrowRight, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/features/pods/components/back-link";
import { UseSyllabusButton } from "@/features/pods/components/use-syllabus-button";
import { CatalogueSubjects } from "@/features/syllabus/components/catalogue-subjects";
import { isId } from "@/lib/ids";
import { coverFor } from "@/lib/pods/covers";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Catalogue syllabus" };

const STEPS = [
  "Every subject becomes a pod",
  "Set your exam date and daily time",
  "Get a day-by-day plan",
];

/**
 * One ready-made syllabus, previewed as the exam pod it becomes: what it covers, where the
 * weight sits, and one action to use it. The action stays in thumb reach on phones.
 */
export default async function CatalogueSyllabusPage({
  params,
}: PageProps<"/syllabus/catalogue/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const version = isId(id) ? await catalogueService.findApproved(id) : null;
  if (!version) notFound();
  const added = (await podService.exams(user)).exams.some(
    (e) => e.id === version.id,
  );
  const topics = version.subjects.reduce((n, s) => n + s.topics.length, 0);
  const action = added ? (
    <Button asChild variant="secondary" className="w-full sm:w-auto">
      <Link href={`/pods/exam/${version.id}`}>
        Open exam pod <ArrowRight aria-hidden />
      </Link>
    </Button>
  ) : (
    <UseSyllabusButton versionId={version.id} />
  );

  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0">
      <div>
        <BackLink href="/syllabus/catalogue" label="Catalogue" />
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <PodCover cover={coverFor(version.id)} className="h-24 md:h-28" />
          <div className="flex flex-col gap-5 p-4 md:flex-row md:items-end md:justify-between md:p-5">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-small text-ink-muted">
                {[version.exam?.name, version.exam?.board]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <h1 className="font-heading text-h1 font-semibold break-words text-ink">
                {version.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-small text-ink-muted">
                <BadgeCheck className="size-4 text-accent" aria-hidden />
                {added
                  ? "Already in your pods"
                  : "Checked by our team against the official syllabus"}
              </span>
            </div>
            <dl className="flex shrink-0 gap-8">
              {(
                [
                  ["Subjects", version.subjects.length],
                  ["Topics", topics],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <dt className="order-2 text-micro text-ink-muted uppercase">
                    {label}
                  </dt>
                  <dd className="font-heading text-display font-semibold text-ink tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {/* What happens next, so the one action isn't a leap in the dark. */}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-card bg-surface-muted px-4 py-3 text-small text-ink"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface font-mono text-small text-ink-muted">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <section aria-labelledby="subjects" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="subjects" className="text-h2">
              What it covers
            </h2>
            <p className="text-small text-ink-muted">
              The bar is each subject&apos;s share of the exam. Open one to see
              its topics.
            </p>
          </div>
          <div className="hidden sm:block">{action}</div>
        </div>
        <CatalogueSubjects subjects={version.subjects} />
      </section>

      {/* Phones: the action sits above the tab bar, in thumb reach. */}
      <div className="fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 rounded-card border border-border bg-surface p-2 shadow-lg sm:hidden">
        {action}
      </div>
    </div>
  );
}
