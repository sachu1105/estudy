import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ListRowsSkeleton,
  SideColumnSkeleton,
  SquadScreenSkeleton,
} from "@/features/groups/components/squad-skeletons";

/** Friends and DMs while loading: the rail, the chats column on md+, and the page. */
export function FriendsSkeleton({ children }: { children: ReactNode }) {
  return (
    <SquadScreenSkeleton>
      <SideColumnSkeleton>
        <div className="flex h-14 items-center border-b border-border px-4">
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex flex-col p-2">
          <ListRowsSkeleton rows={2} />
          <ListRowsSkeleton rows={4} avatar />
        </div>
      </SideColumnSkeleton>
      <div aria-hidden className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>
    </SquadScreenSkeleton>
  );
}
