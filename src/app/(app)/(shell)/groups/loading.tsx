import {
  ChannelListSkeleton,
  SideColumnSkeleton,
  SquadHomeSkeleton,
  SquadScreenSkeleton,
} from "@/features/groups/components/squad-skeletons";

/**
 * Moving to another squad: the whole squad screen as a skeleton (rail, channel list,
 * home) until its layout has the squad's data. A missing squad still shows not-found,
 * streamed after this (with a 200, as on Today).
 */
export default function Loading() {
  return (
    <SquadScreenSkeleton>
      <SideColumnSkeleton phone>
        <ChannelListSkeleton />
      </SideColumnSkeleton>
      <div aria-hidden className="hidden min-w-0 flex-1 md:block">
        <div className="mx-auto max-w-content px-8 pt-6">
          <SquadHomeSkeleton />
        </div>
      </div>
    </SquadScreenSkeleton>
  );
}
