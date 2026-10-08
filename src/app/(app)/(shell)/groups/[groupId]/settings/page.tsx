import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SquadHeading } from "@/features/groups/components/channels/channel-header";
import { SquadSettingsForm } from "@/features/groups/components/squad-settings-form";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";
import { catalogueService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Squad settings" };

/** What the squad is and who can get in. Its admins only (rule 9). */
export default async function SquadSettingsPage({
  params,
}: PageProps<"/groups/[groupId]/settings">) {
  const user = await requireUser();
  const { groupId } = await params;
  const ok = isId(groupId)
    ? await groupService.require(user, groupId, "ADMIN")
    : null;
  if (!ok || "error" in ok) notFound();
  const [view, exams] = await Promise.all([
    groupService.view(user, groupId),
    catalogueService.listExams(),
  ]);
  if (!view) notFound();
  const { group } = view;

  return (
    <>
      <SquadHeading
        groupId={groupId}
        icon={Settings}
        title="Squad settings"
        subtitle="Changes show to everyone in the squad, and in Discover when it's listed."
      />
      <SquadSettingsForm
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          examId: group.exam?.id ?? null,
          visibility: group.visibility,
          joinMode: group.joinMode,
          joinQuestion: group.joinQuestion,
        }}
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
      />
    </>
  );
}
