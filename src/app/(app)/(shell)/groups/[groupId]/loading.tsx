import {
  ChannelListSkeleton,
  SquadHomeSkeleton,
} from "@/features/groups/components/squad-skeletons";

/**
 * A page inside the squad while the rail (and on md+ the channel list) stays. On a phone
 * the squad's home is its channel list in a rounded panel, so that's the shape here.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="-mx-4 -mt-4 -mb-24 flex min-h-dvh flex-col overflow-hidden rounded-tl-[20px] border-t border-l border-border bg-surface pb-24 md:hidden">
        <ChannelListSkeleton />
      </div>
      <div className="hidden md:block">
        <SquadHomeSkeleton />
      </div>
    </div>
  );
}
