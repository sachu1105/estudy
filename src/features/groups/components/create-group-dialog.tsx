"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { createGroupAction } from "../actions";

/** A new study group: who it's for, and whether anyone can join. */
export function CreateGroupDialog({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examId, setExamId] = useState("none");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus aria-hidden /> Create squad
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await createGroupAction({
                name,
                description,
                examId: examId === "none" ? null : examId,
                visibility,
              });
              if (!result.ok) return void toast.error(result.error);
              setOpen(false);
              router.push(`/groups/${result.groupId}`);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create a squad</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              maxLength={80}
              placeholder="LDC 2026 Kollam"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-description">
              What it&apos;s for (optional)
            </Label>
            <Textarea
              id="group-description"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-exam">Exam</Label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger id="group-exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any exam</SelectItem>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Who can join</span>
            <SegmentedControl
              ariaLabel="Who can join"
              value={visibility}
              onValueChange={setVisibility}
              options={[
                { value: "PUBLIC", label: "Anyone" },
                { value: "PRIVATE", label: "By request or invite" },
              ]}
              className="self-start"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || name.trim().length < 3}
            >
              Create squad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
