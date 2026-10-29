import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import type { PodCover as Cover } from "@/lib/pods/covers";

export type ProfileBannerUser = {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  cover: Cover;
  handle: string | null;
};

/**
 * The top of a profile, used both in settings and on the shared page: cover art, the
 * photo straddling its edge, then the name, handle and bio. Actions (edit, share, or
 * nothing at all) are passed in, so the shape stays the same wherever it appears.
 */
export function ProfileBanner({
  user,
  joinedAt,
  actions,
  overlay,
  stats,
  verified = false,
}: {
  user: ProfileBannerUser;
  /** On a paid plan: the verified seal after the name. */
  verified?: boolean;
  joinedAt?: Date;
  /** Buttons beside the name. */
  actions?: ReactNode;
  /** Controls drawn on the cover itself, like "Change cover". */
  overlay?: ReactNode;
  /** A row under the bio: streak, XP, squads. */
  stats?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="relative">
        <PodCover cover={user.cover} className="h-28 sm:h-36" />
        {overlay ? (
          <div className="absolute top-3 right-3 flex gap-2">{overlay}</div>
        ) : null}
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        {/* PodCover is positioned, so the photo needs to be too, to sit over it. */}
        <div className="relative -mt-10 flex flex-wrap items-end justify-between gap-3 sm:-mt-12">
          <Avatar
            name={user.displayName}
            src={user.avatarUrl}
            size="lg"
            className="size-20 rounded-[22px] border-4 border-surface text-h2 sm:size-24"
          />
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <h2 className="text-h1">
            {user.displayName}
            {verified ? (
              <>
                {" "}
                <VerifiedMark className="size-5" />
              </>
            ) : null}
          </h2>
          {user.handle ? (
            <p className="font-mono text-small text-ink-muted">
              @{user.handle}
            </p>
          ) : null}
        </div>

        {user.bio ? (
          <p className="mt-3 max-w-prose text-body text-pretty text-ink-muted">
            {user.bio}
          </p>
        ) : null}

        {joinedAt ? (
          <p className="mt-3 flex items-center gap-1.5 text-small text-ink-subtle">
            <CalendarDays className="size-4" aria-hidden />
            Studying here since{" "}
            {joinedAt.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}

        {stats ? <div className="mt-4">{stats}</div> : null}
      </div>
    </section>
  );
}
