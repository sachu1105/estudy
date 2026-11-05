import { Skeleton } from "@/components/ui/skeleton";
import { FriendsSkeleton } from "@/features/friends/components/friends-skeleton";

/** Friends: the tab bar, then a list of people. */
export default function Loading() {
  return (
    <FriendsSkeleton>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 md:h-14 md:flex-row md:items-center md:px-6 md:py-0">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2 md:ml-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-4 md:px-6 md:pt-6">
        <Skeleton className="mb-2 h-3 w-28" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex min-h-16 items-center gap-3 border-t border-border py-2 first-of-type:border-t-0"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="size-10 rounded-full" />
          </div>
        ))}
      </div>
    </FriendsSkeleton>
  );
}
