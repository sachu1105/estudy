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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  asksToJoin,
  SQUAD_ACCESS,
  type SquadAccess,
} from "@/lib/squads/access";
import {
  SQUAD_TEMPLATES,
  TEMPLATE_KEYS,
  type TemplateKey,
} from "@/lib/squads/templates";

import { createGroupAction } from "../actions";
import { ChoiceRows } from "./choice-rows";
import { SquadAccessField } from "./squad-access-field";

const TEMPLATES = TEMPLATE_KEYS.map((value) => ({
  value,
  label: SQUAD_TEMPLATES[value].label,
  description: SQUAD_TEMPLATES[value].description,
}));

/** A new squad: who it's for, the channels it starts with, and who can join. */
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
  const [template, setTemplate] = useState<TemplateKey>("EXAM");
  const [access, setAccess] = useState<SquadAccess>("OPEN");
  const [question, setQuestion] = useState("");
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
                visibility: SQUAD_ACCESS[access].visibility,
                joinMode: SQUAD_ACCESS[access].joinMode,
                joinQuestion: asksToJoin(access) ? question : "",
                template,
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
            <span className="text-small font-medium">Start with</span>
            <ChoiceRows
              label="Start with"
              options={TEMPLATES}
              value={template}
              onChange={setTemplate}
            />
          </div>
          <SquadAccessField
            access={access}
            onAccessChange={setAccess}
            question={question}
            onQuestionChange={setQuestion}
          />
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
