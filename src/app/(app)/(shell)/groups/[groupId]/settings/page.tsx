import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SquadHeading } from "@/features/groups/components/channels/channel-header";
import { SalesPanel } from "@/features/groups/components/pay/sales-panel";
import { SquadOfferForm } from "@/features/groups/components/pay/squad-offer-form";
import { SquadCoverButton } from "@/features/groups/components/squad-cover-button";
import { SquadSettingsForm } from "@/features/groups/components/squad-settings-form";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import {
  groupService,
  squadCoverService,
  squadPay,
} from "@/server/services/groups";
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
  const [view, exams, banner, canPrice, sales] = await Promise.all([
    groupService.view(user, groupId),
    catalogueService.listExams(),
    squadCoverService.get(user, groupId),
    squadPay.canPrice(user),
    squadPay.sales(user, groupId),
  ]);
  if (!view || !banner) notFound();
  const { group } = view;
  // The pass is the owner's alone: the money is theirs.
  const owner = view.role === "OWNER";
  const priced = group.pricePaise !== null;

  return (
    <>
      <SquadHeading
        groupId={groupId}
        icon={Settings}
        title="Squad settings"
        subtitle="Changes show to everyone in the squad, and in Discover when it's listed."
      />
      <div className="mb-6">
        <SquadCoverButton
          groupId={groupId}
          selection={banner.selection}
          cover={banner.cover}
        />
      </div>
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
      {owner && (canPrice || priced) ? (
        <div className="mt-8 flex flex-col gap-8">
          <SquadOfferForm
            groupId={group.id}
            canPrice={canPrice}
            initial={{
              pricePaise: group.pricePaise,
              accessDays: group.accessDays,
              offer: group.offer,
              demoUrl: group.demoUrl,
            }}
          />
          {sales && (priced || sales.count > 0) ? (
            <SalesPanel sales={sales} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
