"use client";

import { useState, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { SettingsRow } from "@/features/settings/components/settings-section";

import { setFindableAction } from "../actions";

/**
 * Public or private for friends. Public: anyone signed in can find you and send you a
 * request. Private: you're hidden, and you add friends yourself.
 */
export function FindableSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = (next: boolean) =>
    start(async () => {
      setOn(next);
      const result = await setFindableAction({ findable: next });
      if (!result.ok) {
        setOn(!next);
        return void toast.error(result.error);
      }
      toast.success(next ? "You're public" : "You're private");
    });
  return (
    <SettingsRow
      label="Show me in friend search"
      htmlFor="findable"
      hint={
        on
          ? "Anyone can find you and send a request."
          : "Hidden. Only you can send requests."
      }
      control={
        <Switch
          id="findable"
          checked={on}
          disabled={pending}
          onCheckedChange={toggle}
        />
      }
    />
  );
}
