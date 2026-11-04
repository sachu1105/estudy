"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { SettingsRow } from "@/features/settings/components/settings-section";
import { profileUrl } from "@/lib/profile/profile";

import { setSharingAction } from "../actions";

/**
 * Sharing the profile page, off until the user turns it on. Its address is the username;
 * the copy button only appears once the page is actually reachable, so the link we hand
 * over always works.
 */
export function ShareProfile({
  initial,
  handle,
  origin,
}: {
  initial: boolean;
  handle: string | null;
  /** The canonical address, from the server: the link must work wherever it is pasted. */
  origin: string;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const path = handle ? `/u/${handle}` : null;

  const toggle = (next: boolean) =>
    start(async () => {
      setIsPublic(next);
      const result = await setSharingAction({ profilePublic: next });
      if (!result.ok) {
        setIsPublic(!next);
        return void toast.error(result.error);
      }
      toast.success(next ? "Profile is shared" : "Profile is private again");
      router.refresh();
    });

  const copy = async () => {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(profileUrl(origin, handle));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copying didn't work. Select the address and copy it.");
    }
  };

  return (
    <SettingsRow
      label="Share my profile"
      htmlFor="share"
      hint="A page anyone with the link can open. Never your email or pods."
      control={
        <Switch
          id="share"
          checked={isPublic}
          disabled={pending || !handle}
          onCheckedChange={toggle}
        />
      }
      below={
        isPublic && path ? (
          <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-muted p-2">
            <span className="min-w-0 flex-1 truncate font-mono text-small text-ink">
              {origin}
              {path}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={path} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden /> Open
              </Link>
            </Button>
          </div>
        ) : null
      }
    />
  );
}
