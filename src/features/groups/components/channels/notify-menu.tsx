"use client";

import { Bell, BellOff, BellRing, AtSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { setNotifyAction } from "../../channel-actions";

export type NotifyLevel = "ALL" | "MENTIONS" | "MUTE";

const LEVELS = [
  { value: "ALL" as const, label: "Everything", icon: BellRing },
  { value: "MENTIONS" as const, label: "Only mentions", icon: AtSign },
  { value: "MUTE" as const, label: "Nothing", icon: BellOff },
];

/** How much of this channel reaches you. Yours alone: it changes nothing for others. */
export function NotifyMenu({
  groupId,
  channelId,
  level,
}: {
  groupId: string;
  channelId: string;
  level: NotifyLevel;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const Icon =
    level === "MUTE" ? BellOff : level === "MENTIONS" ? AtSign : Bell;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Notifications: ${LEVELS.find((l) => l.value === level)?.label}`}
        disabled={pending}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:size-8"
      >
        <Icon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LEVELS.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onSelect={() =>
              start(async () => {
                const result = await setNotifyAction({
                  groupId,
                  channelId,
                  level: l.value,
                });
                if (!result.ok) return void toast.error(result.error);
                router.refresh();
              })
            }
          >
            <l.icon aria-hidden /> {l.label}
            {l.value === level ? (
              <span className="ml-auto text-small text-ink-muted">now</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
