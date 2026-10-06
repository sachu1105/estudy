"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FEATURE_FLAGS,
  type FeatureFlag,
  type SettingValue,
} from "@/lib/settings/schemas";

import { useSaveSetting } from "./use-save-setting";

const card =
  "flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5";

/** The banner every signed-in user sees at the top of the app. */
export function AnnouncementForm({
  initial,
}: {
  initial: SettingValue<"announcement">;
}) {
  const [value, setValue] = useState(initial);
  const { save, pending } = useSaveSetting("announcement");
  return (
    <section className={card} aria-labelledby="announcement">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="announcement" className="text-h3">
            Announcement banner
          </h2>
          <p className="text-small text-ink-muted">
            Shown at the top of every app page while on.
          </p>
        </div>
        <Switch
          aria-label="Show the banner"
          checked={value.active}
          onCheckedChange={(active) => setValue({ ...value, active })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="announcement-text">Text</Label>
        <Input
          id="announcement-text"
          value={value.text}
          maxLength={200}
          onChange={(e) => setValue({ ...value, text: e.target.value })}
          placeholder="LDC 2026 notification is out. Update your exam date."
        />
      </div>
      <SegmentedControl
        ariaLabel="Banner tone"
        value={value.tone}
        onValueChange={(tone) => setValue({ ...value, tone })}
        options={[
          { value: "info", label: "Information" },
          { value: "important", label: "Important" },
        ]}
        className="self-start"
      />
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending || (value.active && !value.text.trim())}
        onClick={() => save(value, "Banner saved")}
      >
        Save banner
      </Button>
    </section>
  );
}

/** Maintenance mode: staff keep working, everyone else sees the message. */
export function MaintenanceForm({
  initial,
}: {
  initial: SettingValue<"maintenance">;
}) {
  const [value, setValue] = useState(initial);
  const { save, pending } = useSaveSetting("maintenance");
  return (
    <section className={card} aria-labelledby="maintenance">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="maintenance" className="text-h3">
            Maintenance mode
          </h2>
          <p className="text-small text-ink-muted">
            Users see the message instead of the app. Staff can still sign in
            and use the admin panel.
          </p>
        </div>
        <Switch
          aria-label="Maintenance mode"
          checked={value.on}
          onCheckedChange={(on) => setValue({ ...value, on })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="maintenance-message">Message</Label>
        <Textarea
          id="maintenance-message"
          value={value.message}
          maxLength={300}
          onChange={(e) => setValue({ ...value, message: e.target.value })}
          placeholder="We're updating the app. Back by 6 pm; your plan and streak are safe."
        />
      </div>
      <Button
        variant={value.on ? "danger" : "secondary"}
        className="self-start"
        disabled={pending}
        onClick={() =>
          save(
            value,
            value.on ? "Maintenance mode is on" : "Maintenance mode is off",
          )
        }
      >
        Save
      </Button>
    </section>
  );
}

/** Switches to turn a part of the app off in a hurry. Everything is on by default. */
export function FlagsForm({ initial }: { initial: SettingValue<"flags"> }) {
  const [value, setValue] = useState(initial);
  const { save, pending } = useSaveSetting("flags");
  return (
    <section className={card} aria-labelledby="flags">
      <h2 id="flags" className="text-h3">
        Feature switches
      </h2>
      <ul className="flex flex-col gap-3">
        {(Object.entries(FEATURE_FLAGS) as [FeatureFlag, string][]).map(
          ([flag, label]) => (
            <li key={flag} className="flex items-center justify-between gap-4">
              <Label htmlFor={`flag-${flag}`}>{label}</Label>
              <Switch
                id={`flag-${flag}`}
                checked={value[flag] ?? true}
                onCheckedChange={(on) => setValue({ ...value, [flag]: on })}
              />
            </li>
          ),
        )}
      </ul>
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={() => save(value, "Switches saved")}
      >
        Save switches
      </Button>
    </section>
  );
}
