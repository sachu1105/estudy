"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { Row, Section } from "./section";

type Intensity = "light" | "steady" | "intense";

export function GalleryControls() {
  const id = useId();
  const [intensity, setIntensity] = useState<Intensity>("steady");
  const [chips, setChips] = useState(["LDC"]);
  const [agree, setAgree] = useState(false);
  const toggleChip = (chip: string) =>
    setChips((current) =>
      current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip],
    );

  return (
    <Section title="Controls">
      <Row label="Button">
        <Button variant="primary">
          Start session <ArrowRight aria-hidden />
        </Button>
        <Button variant="secondary">Edit plan</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="danger">
          <Trash2 aria-hidden /> Delete group
        </Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
        <Button variant="secondary" size="sm">
          Small
        </Button>
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Display name</Label>
          <Input id={`${id}-name`} placeholder="How others see you" />
          <FieldHint>Shown on group and global ranks.</FieldHint>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input id={`${id}-email`} defaultValue="not-an-email" aria-invalid />
          <FieldError>Enter an email like name@example.com.</FieldError>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-exam`}>Exam</Label>
          <Select defaultValue="ldc">
            <SelectTrigger id={`${id}-exam`}>
              <SelectValue placeholder="Pick an exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ldc">Kerala PSC LDC</SelectItem>
              <SelectItem value="lgs">Kerala PSC LGS</SelectItem>
              <SelectItem value="cgl">SSC CGL</SelectItem>
              <SelectItem value="ntpc">RRB NTPC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-notes`}>Notes</Label>
          <Textarea
            id={`${id}-notes`}
            rows={2}
            placeholder="Anything to remember for this topic"
          />
        </div>
      </div>

      <Row label="Checkbox, switch">
        <label className="flex items-center gap-2 text-body">
          <Checkbox
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
          />
          I&apos;m new to PSC
        </label>
        <label className="flex items-center gap-2 text-body">
          <Switch defaultChecked /> Session reminders
        </label>
      </Row>

      <Row label="Segmented control, chip">
        <SegmentedControl
          ariaLabel="Intensity"
          value={intensity}
          onValueChange={setIntensity}
          options={[
            { value: "light", label: "Light" },
            { value: "steady", label: "Steady" },
            { value: "intense", label: "Intense" },
          ]}
        />
        {["LDC", "LGS", "Degree level"].map((chip) => (
          <Chip
            key={chip}
            selected={chips.includes(chip)}
            onClick={() => toggleChip(chip)}
          >
            {chip}
          </Chip>
        ))}
      </Row>
    </Section>
  );
}
