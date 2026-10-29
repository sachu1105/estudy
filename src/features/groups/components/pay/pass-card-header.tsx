import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { VerifiedMark } from "@/components/blocks/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import type { PodCover as Cover } from "@/lib/pods/covers";

import { PaidMark } from "./paid-mark";

/**
 * The top of a pass card, the same for a paid squad and a paid channel: the squad's
 * art, a tile straddling its edge, what it is, and who runs it. It stays put while the
 * checkout below it steps on.
 */
export function PassCardHeader({
  cover,
  tile,
  kind,
  title,
  titleId,
  heading: Heading = "h2",
  about,
  owner,
  verified = false,
}: {
  cover: Cover;
  /** The icon or initials inside the tile. */
  tile: ReactNode;
  /** "Paid squad", "Paid channel in CPO". */
  kind: string;
  title: string;
  titleId: string;
  heading?: "h1" | "h2";
  about?: string | null;
  owner: { name: string; avatarUrl: string | null; verified: boolean };
  /** The verified seal after the title too (a squad run by a subscriber). */
  verified?: boolean;
}) {
  return (
    <>
      <PodCover cover={cover} className="h-24" />
      <div className="flex flex-col gap-3 px-5">
        {/* Above the cover art (which is positioned), so the tile straddles its edge. */}
        <div className="relative z-10 -mt-8 flex items-end justify-between gap-3">
          <span className="grid size-16 place-items-center rounded-[18px] border-4 border-surface bg-gold-soft font-heading text-h3 font-medium text-gold-ink">
            {tile}
          </span>
          <PaidMark />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-micro text-gold-ink uppercase">{kind}</p>
          <Heading id={titleId} className="text-h1 break-words">
            {title}
            {verified ? (
              <>
                {" "}
                <VerifiedMark className="size-5" />
              </>
            ) : null}
          </Heading>
          {about ? (
            <p className="text-body whitespace-pre-line text-ink-muted">
              {about}
            </p>
          ) : null}
        </div>
        <p className="flex items-center gap-2 text-small text-ink-muted">
          <Avatar name={owner.name} src={owner.avatarUrl} size="sm" />
          <span>
            Run by <span className="font-medium text-ink">{owner.name}</span>
            {owner.verified ? (
              <>
                {" "}
                <VerifiedMark />
              </>
            ) : null}
          </span>
        </p>
      </div>
    </>
  );
}
