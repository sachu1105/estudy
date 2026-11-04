import { ChevronRight, Compass, Inbox, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddFriend } from "@/features/friends/components/add-friend";
import { DmList } from "@/features/friends/components/dm-list";
import {
  FriendActions,
  RequestActions,
  UnblockButton,
} from "@/features/friends/components/friend-actions";
import { FriendsShell } from "@/features/friends/components/friends-shell";
import {
  FRIEND_TABS,
  FriendsTabs,
  type FriendTab,
} from "@/features/friends/components/friends-tabs";
import { PersonRow } from "@/features/friends/components/person-row";
import {
  StudyingNow,
  studyingLine,
} from "@/features/friends/components/studying-now";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { dmService, friendService } from "@/server/services/friends";

export const metadata: Metadata = { title: "Friends" };

/**
 * Friends, as Discord's: who's studying, everyone, requests both ways and adding someone
 * by username, with "Studying now" beside it on wide screens.
 */
export default async function FriendsPage({
  searchParams,
}: PageProps<"/groups/friends">) {
  const user = await requireUser();
  const raw = (await searchParams).tab;
  const tab = FRIEND_TABS.find((t) => t === raw) ?? null;
  const [myHandle, overview, threads, findable] = await Promise.all([
    friendService.ensureHandle(user),
    friendService.overview(user),
    dmService.threads(user),
    friendService.isFindable(user),
  ]);
  const { friends, incoming, outgoing, blocked } = overview;
  // Where no tab is picked, phones open on Messages and md+ on All.
  const show = (key: FriendTab) =>
    tab === key
      ? ""
      : tab === null && key === "messages"
        ? "md:hidden"
        : tab === null && key === "all"
          ? "max-md:hidden"
          : null;

  const sections: [FriendTab, React.ReactNode][] = [
    ["messages", <DmList key="m" threads={threads} pending={0} nav={false} />],
    ["studying", <Studying key="s" friends={friends} />],
    ["all", <All key="a" friends={friends} blocked={blocked} />],
    ["pending", <Pending key="p" incoming={incoming} outgoing={outgoing} />],
    ["add", <Add key="d" myHandle={myHandle} findable={findable} />],
  ];

  return (
    <FriendsShell user={user}>
      <FriendsTabs tab={tab} pending={incoming.length} />
      <div className="flex flex-1">
        <div className="min-w-0 flex-1 px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-12">
          {sections.map(([key, node]) => {
            const cls = show(key);
            return cls === null ? null : (
              <div key={key} className={cn("mx-auto max-w-3xl", cls)}>
                {node}
              </div>
            );
          })}
        </div>
        <aside
          aria-label="Studying now"
          className="hidden w-80 shrink-0 border-l border-border p-4 xl:block"
        >
          <StudyingNow friends={friends} />
        </aside>
      </div>
    </FriendsShell>
  );
}

type Overview = Awaited<ReturnType<typeof friendService.overview>>;

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 text-micro text-ink-muted uppercase">{children}</h2>
  );
}

function Rows({ friends }: { friends: Overview["friends"] }) {
  return (
    <ul>
      {friends.map((f) => (
        <PersonRow
          key={f.id}
          person={f}
          live={f.studyingMinutes !== null}
          status={
            f.studyingMinutes !== null
              ? studyingLine(f.studyingMinutes)
              : undefined
          }
          actions={<FriendActions friendshipId={f.friendshipId} person={f} />}
        />
      ))}
    </ul>
  );
}

function Studying({ friends }: { friends: Overview["friends"] }) {
  const live = friends.filter((f) => f.studyingMinutes !== null);
  if (live.length === 0)
    return (
      <EmptyState
        icon={Users}
        title="No friends studying right now"
        description="When a friend starts a study session, they show here."
      />
    );
  return (
    <section>
      <Heading>Studying — {live.length}</Heading>
      <Rows friends={live} />
    </section>
  );
}

function All({
  friends,
  blocked,
}: {
  friends: Overview["friends"];
  blocked: Overview["blocked"];
}) {
  return (
    <div className="flex flex-col gap-8">
      {friends.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No friends yet"
          description="Add someone by their username, and study together."
          action={
            <Button asChild variant="secondary">
              <Link href="/groups/friends?tab=add">Add friend</Link>
            </Button>
          }
        />
      ) : (
        <section>
          <Heading>All friends — {friends.length}</Heading>
          <Rows friends={friends} />
        </section>
      )}
      {blocked.length ? (
        <section>
          <Heading>Blocked — {blocked.length}</Heading>
          <ul>
            {blocked.map((b) => (
              <PersonRow
                key={b.id}
                person={b}
                actions={<UnblockButton userId={b.id} name={b.displayName} />}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Pending({
  incoming,
  outgoing,
}: {
  incoming: Overview["incoming"];
  outgoing: Overview["outgoing"];
}) {
  if (incoming.length + outgoing.length === 0)
    return (
      <EmptyState
        icon={Inbox}
        title="No requests waiting"
        description="Requests you get and send show here until someone answers."
      />
    );
  const list = (rows: Overview["incoming"], mine: boolean) => (
    <ul>
      {rows.map((r) => (
        <PersonRow
          key={r.friendshipId}
          person={r}
          status={
            r.note
              ? `“${r.note}”`
              : mine
                ? "Request you sent"
                : `@${r.handle ?? ""} wants to be friends`
          }
          actions={
            <RequestActions
              friendshipId={r.friendshipId}
              name={r.displayName}
              incoming={!mine}
            />
          }
        />
      ))}
    </ul>
  );
  return (
    <div className="flex flex-col gap-8">
      {incoming.length ? (
        <section aria-label="Received">
          <Heading>Received — {incoming.length}</Heading>
          {list(incoming, false)}
        </section>
      ) : null}
      {outgoing.length ? (
        <section aria-label="Sent">
          <Heading>Sent — {outgoing.length}</Heading>
          {list(outgoing, true)}
        </section>
      ) : null}
    </div>
  );
}

function Add({
  myHandle,
  findable,
}: {
  myHandle: string | null;
  findable: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <AddFriend myHandle={myHandle} findable={findable} />
      <section
        aria-labelledby="more"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="more" className="text-h3">
            Other places to make friends
          </h2>
          <p className="text-body text-ink-muted">
            No username to hand? Open squads for every exam are full of people
            studying for the same one.
          </p>
        </div>
        <Link
          href="/groups/discover"
          className="flex min-h-14 max-w-md items-center gap-3 rounded-card border border-border bg-surface px-3 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span className="grid size-9 place-items-center rounded-control bg-accent-soft text-accent-ink">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="flex-1 font-medium">Explore open squads</span>
          <ChevronRight className="size-5 text-ink-muted" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
