"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";

export type ReadMethod = "rules" | "ai";
export type CatalogueReader =
  | { on: false }
  | { on: true; model: string; provider: string; readsPages: boolean };

/**
 * How the builder reads the syllabus: by its headings and lists (always), or by the AI,
 * offered only while a super admin has it switched on under Admin > AI.
 */
export function ReadMethodPicker({
  reader,
  value,
  onChange,
}: {
  reader: CatalogueReader;
  value: ReadMethod;
  onChange: (value: ReadMethod) => void;
}) {
  if (!reader.on)
    return (
      <p className="text-small text-ink-muted">
        Read by its headings and lists. AI reading is off; a super admin can
        switch it on under Admin &gt; AI.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        ariaLabel="How to read it"
        value={value}
        onValueChange={onChange}
        options={[
          { value: "rules", label: "Headings and lists" },
          { value: "ai", label: "AI" },
        ]}
        className="self-start"
      />
      <p className="text-small text-ink-muted">
        {value === "ai"
          ? `${reader.model} (${reader.provider}) reads it in the background${reader.readsPages ? ", PDFs and photos page by page" : ""}. Its cost goes in Jobs and AI, and you check every subject and topic before approving.`
          : "Headings (Part I, (i) History, Module 1, a line ending in a colon) become subjects; the lists under them become topics. Stated marks set topic weights. No AI, no cost."}
      </p>
    </div>
  );
}
