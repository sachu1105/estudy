"use client";

import {
  Ban,
  Check,
  MessageCircle,
  MoreVertical,
  UserMinus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

import {
  acceptRequestAction,
  blockPersonAction,
  dropFriendAction,
  unblockPersonAction,
} from "../actions";

/** Discord's round icon buttons at the end of a row. */
const round =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-surface-muted text-ink-muted transition-colors duration-[120ms] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-50 md:size-10";

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (
    act: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
  ) =>
    start(async () => {
      const result = await act();
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });
  return { pending, run };
}

/** A friend: message them, or (behind the menu) remove or block them. */
export function FriendActions({
  friendshipId,
  person,
}: {
  friendshipId: string;
  person: { id: string; displayName: string };
}) {
  const { pending, run } = useAct();
  return (
    <>
      <Link
        href={`/groups/friends/dm/${person.id}`}
        aria-label={`Message ${person.displayName}`}
        className={round}
      >
        <MessageCircle className="size-5" aria-hidden />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More for ${person.displayName}`}
          disabled={pending}
          className={round}
        >
          <MoreVertical className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => dropFriendAction({ friendshipId }),
                `Removed ${person.displayName} from your friends`,
              )
            }
          >
            <UserMinus aria-hidden /> Remove friend
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => blockPersonAction({ userId: person.id }),
                `Blocked ${person.displayName}`,
              )
            }
          >
            <Ban aria-hidden /> Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/** A request: accept or decline one sent to you, or take back one you sent. */
export function RequestActions({
  friendshipId,
  name,
  incoming,
}: {
  friendshipId: string;
  name: string;
  incoming: boolean;
}) {
  const { pending, run } = useAct();
  return (
    <>
      {incoming ? (
        <button
          type="button"
          disabled={pending}
          aria-label={`Accept ${name}`}
          className={cn(round, "hover:text-success")}
          onClick={() =>
            run(
              () => acceptRequestAction({ friendshipId }),
              `You and ${name} are friends`,
            )
          }
        >
          <Check className="size-5" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        aria-label={incoming ? `Decline ${name}` : `Cancel request to ${name}`}
        className={cn(round, "hover:text-danger")}
        onClick={() =>
          run(
            () => dropFriendAction({ friendshipId }),
            incoming ? "Request declined" : "Request cancelled",
          )
        }
      >
        <X className="size-5" aria-hidden />
      </button>
    </>
  );
}

export function UnblockButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const { pending, run } = useAct();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-label={`Unblock ${name}`}
      onClick={() =>
        run(() => unblockPersonAction({ userId }), `Unblocked ${name}`)
      }
    >
      Unblock
    </Button>
  );
}
