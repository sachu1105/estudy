"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { joinGroupAction } from "../actions";

/**
 * Join from a squad card in Discover. An open squad joins at once; one that asks opens
 * its page, where the question is.
 */
export function QuickJoin({
  groupId,
  name,
  asks,
  paid = false,
}: {
  groupId: string;
  name: string;
  asks: boolean;
  /** A paid squad: its page has the price and the pass. */
  paid?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (paid)
    return (
      <Button asChild variant="secondary">
        <Link
          href={`/groups/${groupId}`}
          aria-label={`See the pass for ${name}`}
        >
          See pass
        </Link>
      </Button>
    );
  if (asks)
    return (
      <Button asChild variant="secondary">
        <Link href={`/groups/${groupId}`} aria-label={`Ask to join ${name}`}>
          Ask
        </Link>
      </Button>
    );
  return (
    <Button
      variant="secondary"
      disabled={pending}
      aria-label={`Join ${name}`}
      onClick={() =>
        start(async () => {
          const result = await joinGroupAction({ groupId });
          if (!result.ok) return void toast.error(result.error);
          toast.success("You're in");
          router.push(`/groups/${groupId}`);
        })
      }
    >
      Join
    </Button>
  );
}
