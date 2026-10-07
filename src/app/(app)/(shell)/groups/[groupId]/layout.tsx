import { Lock } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/features/pods/components/back-link";
import { GroupMenu } from "@/features/groups/components/group-menu";
import { GroupTabs } from "@/features/groups/components/group-tabs";
import { JoinButton } from "@/features/groups/components/join-controls";
import { isId } from "@/lib/ids";
import { joinModeOf } from "@/lib/squads/access";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";

/**
 * A group. Members see its sections; anyone else sees what it's about and how to get in
 * (rule 9: nothing inside is shown to non-members).
 */
export default async function GroupLayout({
  params,
  children,
}: LayoutProps<"/groups/[groupId]">) {
  const user = await requireUser();
  const { groupId } = await params;
  const view = isId(groupId) ? await groupService.view(user, groupId) : null;
  if (!view) notFound();
  const { group, role } = view;
  const mode = joinModeOf(group);
  const facts = [
    group.exam?.name,
    `${group._count.members} member${group._count.members === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <BackLink href="/groups" label="Squads" />
      <PageHeader
        title={group.name}
        description={facts}
        actions={
          role ? (
            <GroupMenu
              groupId={group.id}
              name={group.name}
              owner={role === "OWNER"}
            />
          ) : null
        }
      />
      {group.visibility === "PRIVATE" ? (
        <Badge tone="outline" className="-mt-6 mb-6">
          <Lock aria-hidden /> private
        </Badge>
      ) : null}
      {role ? (
        <>
          {view.muted ? (
            <p
              role="status"
              className="mb-4 rounded-card bg-surface-muted p-3 text-small"
            >
              A squad admin has muted you for now: you can read, but not share.
            </p>
          ) : null}
          <GroupTabs groupId={group.id} />
          {children}
        </>
      ) : (
        <section className="flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-5">
          {group.description ? (
            <p className="text-body">{group.description}</p>
          ) : null}
          <p className="text-body text-ink-muted">
            {mode === "INVITE_ONLY"
              ? "This squad takes members by invite only. Ask a member for an invite link."
              : mode === "REQUEST"
                ? "Ask to join and an admin of the squad decides, or use an invite from a member."
                : "Join to see the channels, shared notes and tests, and to take part."}
          </p>
          {mode !== "INVITE_ONLY" && (
            <JoinButton
              groupId={group.id}
              asks={mode === "REQUEST"}
              question={group.joinQuestion}
              requested={view.request === "PENDING"}
            />
          )}
        </section>
      )}
    </>
  );
}
