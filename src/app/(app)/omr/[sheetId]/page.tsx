import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OmrWorkspace } from "@/features/omr/components/omr-workspace";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Answer sheet" };

export default async function OmrPage({ params }: PageProps<"/omr/[sheetId]">) {
  const user = await requireUser();
  const { sheetId } = await params;
  const sheet = isId(sheetId) ? await omrService.get(user, sheetId) : null;
  if (!sheet) notFound();
  return (
    <OmrWorkspace
      key={sheet.id}
      id={sheet.id}
      title={sheet.title}
      initialMarks={sheet.marks}
    />
  );
}
