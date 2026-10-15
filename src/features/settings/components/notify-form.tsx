"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { timeOf } from "@/lib/reminders/reminders";

import { saveNotifyPrefsAction } from "../notify-actions";
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
    hint: "At the start of your study window, if you haven't studied yet.",
  },
  {
    key: "streakAtRisk",
    label: "Streak at risk",
    hint: "Once in the evening, only when nothing is logged that day.",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary",
    hint: "On Monday, when last week's summary and the new plan are ready.",
  },
] as const;

/** The three reminders, how they reach you, and when to stay quiet. */
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
  const [pending, start] = useTransition();
  const set = (key: keyof Prefs, value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const togglePush = (on: boolean) =>
    start(async () => {
      set("byPush", on);
      const result = on ? await enablePush(vapidKey) : await disablePush();
      if (!result.ok) {
        set("byPush", !on);
        toast.error(result.error);
      }
    });

  // The heading and the card around this live in the settings section that holds it.
  return (
    <div className="flex flex-col gap-4">
      {REMINDERS.map((r) => (
        <div key={r.key} className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={r.key}>{r.label}</Label>
            <p className="text-small text-ink-muted">{r.hint}</p>
          </div>
          <Switch
            id={r.key}
            checked={prefs[r.key]}
            onCheckedChange={(on) => set(r.key, on)}
          />
        </div>
      ))}

      <hr className="border-border" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="byEmail">By email</Label>
          <p className="text-small text-ink-muted">
            Every reminder says how to stop it.
          </p>
        </div>
        <Switch
          id="byEmail"
          checked={prefs.byEmail}
          onCheckedChange={(on) => set("byEmail", on)}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="byPush">On this device</Label>
          <p className="text-small text-ink-muted">
            {pushAvailable
              ? "A notification on your phone or desktop, even with the app closed."
              : "Push isn't set up on this server yet."}
          </p>
        </div>
        <Switch
          id="byPush"
          checked={prefs.byPush}
          disabled={!pushAvailable || pending}
          onCheckedChange={togglePush}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="windowStart">Your study window starts at</Label>
        <Input
          id="windowStart"
          type="time"
          value={windowStart}
          className="max-w-40"
          onChange={(e) => setWindowStart(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="mb-2 text-small font-medium">Quiet hours</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quietFrom">Quiet from</Label>
          <Input
            id="quietFrom"
            type="time"
            value={quietFrom}
            className="max-w-32"
            onChange={(e) => setQuietFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quietTo">Quiet until</Label>
          <Input
            id="quietTo"
            type="time"
            value={quietTo}
            className="max-w-32"
            onChange={(e) => setQuietTo(e.target.value)}
          />
        </div>
      </fieldset>

      <Button
        variant="primary"
        className="self-start"
        disabled={pending}
        onClick={() =>
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
            toast.success("Reminders saved");
          })
        }
      >
        Save reminders
      </Button>
    </div>
  );
}
