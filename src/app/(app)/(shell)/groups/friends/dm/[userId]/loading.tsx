import { FriendsSkeleton } from "@/features/friends/components/friends-skeleton";
import { ChatSkeleton } from "@/features/groups/components/squad-skeletons";

/** A direct chat opening: the chats column stays in shape, the chat fills the rest. */
export default function Loading() {
  return (
    <FriendsSkeleton>
      <div
        data-focus-view
        className="flex flex-1 flex-col px-4 pt-4 pb-4 md:px-6"
      >
        <ChatSkeleton />
      </div>
    </FriendsSkeleton>
  );
}
