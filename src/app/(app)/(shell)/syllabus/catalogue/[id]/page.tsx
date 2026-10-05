import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SyllabusTreeView } from "@/features/syllabus/components/syllabus-tree-view";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Catalogue syllabus" };

export default async function CatalogueSyllabusPage({
  params,
}: PageProps<"/syllabus/catalogue/[id]">) {
  await requireUser();
  const { id } = await params;
  const version = isId(id) ? await catalogueService.findApproved(id) : null;
  if (!version) notFound();
  return (
    <>
      <PageHeader
        title={version.title}
        description={version.exam?.name}
        actions={
          <Button asChild variant="primary" className="w-full sm:w-auto">
            <Link href={`/onboarding?syllabus=${version.id}`}>
              Use this syllabus
            </Link>
          </Button>
        }
      />
      <SyllabusTreeView subjects={version.subjects} />
    </>
  );
}
