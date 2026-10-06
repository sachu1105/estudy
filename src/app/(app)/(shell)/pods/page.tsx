import { Boxes, Search, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ExamCard } from "@/features/pods/components/exam-card";
import { NewPodButton } from "@/features/pods/components/new-pod-button";
import { PodCard } from "@/features/pods/components/pod-card";
import { SyllabusCard } from "@/features/syllabus/components/syllabus-card";
import { syllabusState } from "@/features/syllabus/state";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";
import { reviewService, uploadUsage } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Pods" };

/**
 * The study space, two levels deep: an exam pod per syllabus, holding a pod per subject.
 * Syllabuses still being read or checked wait here until they're confirmed.
 */
export default async function PodsPage() {
  const user = await requireUser();
  const [{ exams, own }, syllabuses, usage] = await Promise.all([
    podService.exams(user),
    reviewService.list(user),
    uploadUsage(user),
  ]);
  const pending = syllabuses
    .map((s) => ({ ...s, state: syllabusState(s) }))
    .filter((s) => s.state !== "confirmed");
  const atLimit = usage.used >= usage.limit;
  const empty = exams.length === 0 && own.length === 0 && pending.length === 0;

  return (
    <>
      <PageHeader
        title="Pods"
        description="An exam pod for each syllabus, and a pod for every subject in it."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="flex gap-2">
              <Button asChild variant="ghost" className="flex-1 sm:flex-none">
                <Link href="/pods/search">
                  <Search aria-hidden /> Search
                </Link>
              </Button>
              <Button asChild variant="ghost" className="flex-1 sm:flex-none">
                <Link href="/pods/trash">
                  <Trash2 aria-hidden /> Trash
                </Link>
              </Button>
            </div>
            <NewPodButton />
            {atLimit ? null : (
              <Button asChild variant="primary">
                <Link href="/syllabus/new">Add exam syllabus</Link>
              </Button>
            )}
          </div>
        }
      />
      {empty ? (
        <EmptyState
          icon={Boxes}
          title="No pods yet"
          description="Add your exam's syllabus and every subject becomes a pod for its topics, notes and files."
          action={
            <Button asChild variant="secondary">
              <Link href="/syllabus/catalogue">Pick from the catalogue</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {exams.length > 0 ? (
            <section aria-labelledby="exams" className="flex flex-col gap-4">
              <h2 id="exams" className="text-h2">
                Your exams
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {exams.map((e) => (
                  <li key={e.id} className="flex">
                    <ExamCard
                      id={e.id}
                      title={e.title}
                      examName={e.examName}
                      subjects={e.pods.length}
                      topics={e.topics}
                      topicsDone={e.topicsDone}
                      items={e.items}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {pending.length > 0 ? (
            <section aria-labelledby="pending" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="pending" className="text-h2">
                  Being set up
                </h2>
                <p className="text-body text-ink-muted">
                  Check the subjects and confirm, and the exam&apos;s pods
                  appear above.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {pending.map((s) => (
                  <li key={s.id}>
                    <SyllabusCard
                      id={s.id}
                      title={s.title}
                      examName={s.exam?.name ?? null}
                      subjects={s._count.subjects}
                      state={s.state}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {own.length > 0 ? (
            <section aria-labelledby="own-pods" className="flex flex-col gap-4">
              <h2 id="own-pods" className="text-h2">
                Your own pods
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {own.map((p) => (
                  <li key={p.id} className="flex">
                    <PodCard
                      id={p.id}
                      name={p.name}
                      kind={p.kind}
                      topics={p.topics.length}
                      topicsDone={p.topicsDone}
                      items={p.items}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-small text-ink-muted">
            <Link
              href="/syllabus/catalogue"
              className="font-medium text-accent-ink hover:underline"
            >
              Browse the syllabus catalogue
            </Link>
            {Number.isFinite(usage.limit)
              ? ` · ${usage.used} of ${usage.limit} uploads used.`
              : null}
          </p>
        </div>
      )}
    </>
  );
}
