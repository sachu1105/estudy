"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { timeOf } from "@/lib/reminders/reminders";

import { saveNotifyPrefsAction } from "../notify-actions";
import { SettingsRow } from "./settings-section";
import { enablePush, disablePush } from "./push";

type Prefs = {
  sessionReminder: boolean;
  streakAtRisk: boolean;
  streakAtRiskLabel?: string;
  weeklySummary: boolean;
  byEmail: boolean;
  byPush: boolean;
  windowStartMin: number;
  quietFromMin: number;
  quietToMin: number;
};

const REMINDERS = [
  {
    key: "sessionReminder",
    label: "Time to study",
    hint: "When your study window starts",
  },
  {
    key: "streakAtRisk",
    label: "Streak at risk",
    hint: "Evenings, if nothing's logged",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary",
    hint: "Mondays, with the new plan",
  },
] as const;

/** The three reminders, how they reach you, and when to stay quiet: one row each. */
export function NotifyForm({
  initial,
  pushAvailable,
  vapidKey,
}: {
  initial: Prefs;
  pushAvailable: boolean;
  vapidKey: string | null;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [windowStart, setWindowStart] = useState(
    timeOf(initial.windowStartMin),
  );
  const [quietFrom, setQuietFrom] = useState(timeOf(initial.quietFromMin));
  const [quietTo, setQuietTo] = useState(timeOf(initial.quietToMin));
  const now = JSON.stringify([prefs, windowStart, quietFrom, quietTo]);
  // What was last saved; Save wakes up only when something differs from it.
  const [saved, setSaved] = useState(now);
  const [pending, start] = useTransition();
  const set = (key: keyof Prefs, value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }));
  const dirty = now !== saved;

  const togglePush = (on: boolean) =>
    start(async () => {
      set("byPush", on);
      const result = on ? await enablePush(vapidKey) : await disablePush();
      if (!result.ok) {
        set("byPush", !on);
        toast.error(result.error);
      }
    });

  const toggle = (key: keyof Prefs, on?: (v: boolean) => void) => (
    <Switch
      id={key}
      checked={prefs[key] as boolean}
      disabled={key === "byPush" && (!pushAvailable || pending)}
      onCheckedChange={on ?? ((v) => set(key, v))}
    />
  );

  const save = () =>
    start(async () => {
      const result = await saveNotifyPrefsAction({
        sessionReminder: prefs.sessionReminder,
        streakAtRisk: prefs.streakAtRisk,
        weeklySummary: prefs.weeklySummary,
        byEmail: prefs.byEmail,
        byPush: prefs.byPush,
        windowStart,
        quietFrom,
        quietTo,
      });
      if (!result.ok) return void toast.error(result.error);
      setSaved(now);
      toast.success("Reminders saved");
    });

  return (
    <>
      {REMINDERS.map((r) => (
        <SettingsRow
          key={r.key}
          label={r.label}
          hint={r.hint}
          htmlFor={r.key}
          control={toggle(r.key)}
        />
      ))}
      <SettingsRow
        label="By email"
        htmlFor="byEmail"
        control={toggle("byEmail")}
      />
      <SettingsRow
        label="On this device"
        htmlFor="byPush"
        hint={pushAvailable ? undefined : "Not set up on this server yet"}
        control={toggle("byPush", togglePush)}
      />
      <SettingsRow
        label="Study window starts"
        htmlFor="windowStart"
        control={
          <Input
            id="windowStart"
            type="time"
            value={windowStart}
            className="w-36"
            onChange={(e) => setWindowStart(e.target.value)}
          />
        }
      />
      <SettingsRow
        label="Quiet hours"
        stack
        control={
          // Two fields that share the width on a phone, side by side beside the name from sm.
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 max-sm:w-full">
            <Input
              aria-label="Quiet from"
              type="time"
              value={quietFrom}
              className="min-w-0 sm:w-36"
              onChange={(e) => setQuietFrom(e.target.value)}
            />
            <span aria-hidden className="text-ink-muted">
              –
            </span>
            <Input
              aria-label="Quiet until"
              type="time"
              value={quietTo}
              className="min-w-0 sm:w-36"
              onChange={(e) => setQuietTo(e.target.value)}
            />
          </div>
        }
      />
      <div className="flex justify-end px-4 py-3">
        <Button variant="primary" disabled={pending || !dirty} onClick={save}>
          Save reminders
        </Button>
      </div>
    </>
  );
}
