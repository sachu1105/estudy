"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { HANDLE_MAX, profileUrl } from "@/lib/profile/profile";

import { setSharingAction } from "../actions";

/**
 * Sharing is off until the user turns it on, and turning it on needs an address. The
 * copy button only appears once the profile is actually reachable, so the link we hand
 * over always works.
 */
export function ShareProfile({
  initial,
  origin,
}: {
  initial: {
    profilePublic: boolean;
    handle: string | null;
    suggestedHandle: string;
  };
  /** The canonical address, from the server: the link must work wherever it is pasted. */
  origin: string;
}) {
  const [isPublic, setIsPublic] = useState(initial.profilePublic);
  const [saved, setSaved] = useState(initial.handle);
  const [handle, setHandle] = useState(
    initial.handle ?? initial.suggestedHandle,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const path = saved ? `/u/${saved}` : null;

  const toggle = (next: boolean) =>
    start(async () => {
      setError(null);
      setIsPublic(next);
      const result = await setSharingAction({
        profilePublic: next,
        handle: next ? handle : undefined,
      });
      if (!result.ok) {
        setIsPublic(!next);
        return void setError(result.error);
      }
      setSaved(result.handle);
      toast.success(next ? "Profile is shared" : "Profile is private again");
    });

  const saveHandle = () =>
    start(async () => {
      setError(null);
      const result = await setSharingAction({
        profilePublic: isPublic,
        handle,
      });
      if (!result.ok) return void setError(result.error);
      setSaved(result.handle);
      toast.success("Address saved");
    });

  const copy = async () => {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(profileUrl(origin, saved!));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copying didn't work. Select the address and copy it.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-ink">Share my profile</p>
          <p className="text-small text-ink-muted">
            Anyone with the link can open it, without an account. Your email,
            plan and pod material are never shown.
          </p>
        </div>
        <Switch
          checked={isPublic}
          disabled={pending}
          onCheckedChange={toggle}
          aria-label="Share my profile"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="handle">Your address</Label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-small text-ink-muted">/u/</span>
          <Input
            id="handle"
            value={handle}
            maxLength={HANDLE_MAX}
            spellCheck={false}
            autoCapitalize="none"
            className="w-44 font-mono"
            onChange={(event) =>
              setHandle(event.target.value.toLowerCase().trim())
            }
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || handle === saved || !handle}
            onClick={saveHandle}
          >
            Save
          </Button>
        </div>
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldHint>Lowercase letters, numbers and underscores.</FieldHint>
        )}
      </div>

      {isPublic && path ? (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface-muted p-2">
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
      ) : null}
    </div>
  );
}
