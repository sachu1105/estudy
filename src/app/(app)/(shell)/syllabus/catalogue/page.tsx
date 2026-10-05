import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { CatalogueList } from "@/features/syllabus/components/catalogue-list";
import { requireUser } from "@/server/auth/session";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  await requireUser();
  const exams = await catalogueService.listExams();
  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Syllabuses checked by our team. Pick one and skip the upload."
      />
      <CatalogueList exams={exams} />
    </>
  );
}
