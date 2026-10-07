import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { groupService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Join a squad" };

// An invite link: joins and opens the group, or says plainly why it can't.
export default async function JoinByLink({
  params,
}: PageProps<"/groups/join/[code]">) {
  const user = await requireUser();
  const { code } = await params;
  const result = /^[A-Za-z0-9]{6,12}$/.test(code)
    ? await groupService.joinByCode(user, code)
    : null;
  if (result?.ok) redirect(`/groups/${result.groupId}`);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1>That invite doesn&apos;t work</h1>
      <p className="text-body text-ink-muted">
        {result && !result.ok
          ? result.message
          : "Check the link, or ask for a new invite."}
      </p>
      <Button asChild variant="primary">
        <Link href="/groups">Go to squads</Link>
      </Button>
    </div>
  );
}
