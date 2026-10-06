"use client";

import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { stageLabels, type PodStage } from "@/lib/pods/stages";
import type { SubjectSetting as Setting } from "@/lib/plans/draft";

const CONFIDENCE = ["New to me", "A little", "Some", "Good", "Strong"];
const INTENSITY = [
  { value: "LIGHT", label: "Light" },
  { value: "STEADY", label: "Steady" },
  { value: "INTENSE", label: "Intense" },
] as const;

/** One subject's two dials: how well the user knows it, and how hard to push it. */
export function SubjectSetting({
  name,
  stage,
  topics,
  topicsDone,
  setting,
  onChange,
}: {
  name: string;
  stage: PodStage;
  topics: number;
  topicsDone: number;
  setting: Setting;
  onChange: (setting: Setting) => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-h3 break-words">{name}</h3>
          <p className="text-small text-ink-muted">
            {topicsDone} of {topics} topic{topics === 1 ? "" : "s"} done
          </p>
        </div>
        <Badge>{stageLabels[stage]}</Badge>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-small text-ink-muted" id={`conf-${name}`}>
          How well do you know it?{" "}
          <span className="text-ink">{CONFIDENCE[setting.confidence - 1]}</span>
        </p>
        <SegmentedControl
          ariaLabel={`How well you know ${name}`}
          value={String(setting.confidence)}
          onValueChange={(v) => onChange({ ...setting, confidence: Number(v) })}
          options={CONFIDENCE.map((label, i) => ({
            value: String(i + 1),
            label: String(i + 1),
            ariaLabel: `${i + 1}, ${label.toLowerCase()}`,
          }))}
          className="w-full [&>*]:flex-1"
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-small text-ink-muted">How hard to push it?</p>
        <SegmentedControl
          ariaLabel={`How hard to push ${name}`}
          value={setting.intensity}
          onValueChange={(intensity) => onChange({ ...setting, intensity })}
          options={INTENSITY.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full [&>*]:flex-1"
        />
      </div>
    </article>
  );
}
