import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import {
  CatalogueList,
  type CatalogueExam,
} from "@/features/syllabus/components/catalogue-list";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const user = await requireUser();
  const [exams, mine] = await Promise.all([
    catalogueService.listExams(),
    podService.exams(user),
  ]);
  const added = new Set(mine.exams.map((e) => e.id));
  const list: CatalogueExam[] = exams.map((e) => ({
    id: e.id,
    name: e.name,
    board: e.board,
    description: e.description,
    syllabuses: e.syllabuses.map((s) => ({
      id: s.id,
      title: s.title,
      subjects: s._count.subjects,
      topics: s.subjects.reduce((n, sub) => n + sub._count.topics, 0),
      added: added.has(s.id),
    })),
  }));

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Ready-made syllabuses, checked by our team. Pick your exam and every subject becomes a pod, ready for a plan."
      />
      <CatalogueList exams={list} />
    </>
  );
}
