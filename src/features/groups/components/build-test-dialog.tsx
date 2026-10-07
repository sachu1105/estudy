"use client";

import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";

import { buildGroupTestAction } from "../actions";

/** A test for the group from the verified pool: pick topics, how many questions, how long. */
export function BuildTestDialog({
  groupId,
  topics,
}: {
  groupId: string;
  topics: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Weekly test");
  const [filter, setFilter] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [count, setCount] = useState("20");
  const [minutes, setMinutes] = useState("15");
  const [pending, start] = useTransition();
  const shown = topics
    .filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 60);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <ClipboardCheck aria-hidden /> Build a test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build a test for the squad</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="test-title">Name</Label>
          <Input
            id="test-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="test-topics">Topics ({chosen.length} picked)</Label>
          <Input
            id="test-topics"
            value={filter}
            placeholder="Filter your topics"
            onChange={(e) => setFilter(e.target.value)}
          />
          <ul className="flex max-h-48 flex-col overflow-y-auto rounded-control border border-border">
            {shown.map((t) => (
              <li key={t}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 hover:bg-surface-muted">
                  <Checkbox
                    checked={chosen.includes(t)}
                    onCheckedChange={(v) =>
                      setChosen((c) =>
                        v === true ? [...c, t] : c.filter((x) => x !== t),
                      )
                    }
                  />
                  <span className="text-body">{t}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Questions</span>
            <SegmentedControl
              ariaLabel="Questions"
              value={count}
              onValueChange={setCount}
              size="sm"
              options={["10", "20", "30"].map((v) => ({ value: v, label: v }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Time</span>
            <SegmentedControl
              ariaLabel="Time"
              value={minutes}
              onValueChange={setMinutes}
              size="sm"
              options={[
                { value: "0", label: "Untimed" },
                { value: "15", label: "15 min" },
                { value: "30", label: "30 min" },
              ]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="primary"
            disabled={pending || chosen.length === 0}
            onClick={() =>
              start(async () => {
                const result = await buildGroupTestAction({
                  groupId,
                  title,
                  topics: chosen,
                  count: Number(count),
                  minutes: minutes === "0" ? null : Number(minutes),
                });
                if (!result.ok) return void toast.error(result.error);
                toast.success("Test shared with the squad");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Share test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
