import { Skeleton } from "@/components/ui/skeleton";
import { SquadScreenSkeleton } from "@/features/groups/components/squad-skeletons";

/** Discover: the exam tabs, the banner and a grid of squad cards. */
export default function Loading() {
  return (
    <SquadScreenSkeleton screen={false}>
      <div aria-hidden className="min-w-0 flex-1">
        <div className="hidden h-14 items-center gap-4 border-b border-border px-6 md:flex">
          {[20, 16, 28, 24].map((w) => (
            <Skeleton key={w} className="h-4" style={{ width: w * 4 }} />
          ))}
          <Skeleton className="ml-auto h-9 w-60 rounded-full" />
        </div>
        <Skeleton className="h-56 rounded-card md:h-64 md:rounded-none" />
        <div className="mx-auto flex max-w-content flex-col gap-4 pt-6 md:px-8 md:pt-8">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    </SquadScreenSkeleton>
  );
}
