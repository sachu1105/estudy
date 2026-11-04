"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { SettingsRow } from "@/features/settings/components/settings-section";
import { HANDLE_MAX } from "@/lib/profile/profile";

import { setSharingAction } from "../actions";

/** The username friends add you by, and your profile's address. Edited in place. */
export function UsernameRow({
  handle,
  profilePublic,
}: {
  handle: string | null;
  profilePublic: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(handle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      const result = await setSharingAction({ profilePublic, handle: value });
      if (!result.ok) return void setError(result.error);
      toast.success("Username saved");
      setEditing(false);
      router.refresh();
    });

  if (!editing)
    return (
      <SettingsRow
        label="Username"
        hint={handle ? `@${handle}` : "Not set yet"}
        control={
          <Button
            variant="secondary"
            size="sm"
            aria-label="Change username"
            onClick={() => setEditing(true)}
          >
            Change
          </Button>
        }
      />
    );

  return (
    <SettingsRow
      label="Username"
      htmlFor="handle"
      below={
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="handle"
              autoFocus
              value={value}
              maxLength={HANDLE_MAX}
              spellCheck={false}
              autoCapitalize="none"
              className="w-52 font-mono"
              onChange={(e) => setValue(e.target.value.toLowerCase().trim())}
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={pending || !value || value === handle}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setValue(handle ?? "");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldHint>Lowercase letters, numbers and underscores.</FieldHint>
          )}
        </form>
      }
    />
  );
}
