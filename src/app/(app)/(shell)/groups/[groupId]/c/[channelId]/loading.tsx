import { ChatSkeleton } from "@/features/groups/components/squad-skeletons";

/** A channel opening: the chat's shape, with the box at the bottom (a focus view on phones). */
export default function Loading() {
  return (
    <div
      data-focus-view
      aria-busy="true"
      aria-label="Loading"
      className="flex flex-1 flex-col pb-4"
    >
      <ChatSkeleton />
    </div>
  );
}
