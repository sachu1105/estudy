"use client";

import { GraduationCap, Hash, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
import { ChoiceTiles } from "./choice-tiles";
import { SquadAccessField } from "./squad-access-field";

const ICONS = { EXAM: GraduationCap, CIRCLE: Users, BLANK: Hash } as const;

const TEMPLATES = TEMPLATE_KEYS.map((value) => ({
  value,
  label: SQUAD_TEMPLATES[value].label,
  description: SQUAD_TEMPLATES[value].description,
  icon: ICONS[value],
}));

/**
 * A new squad, kept short enough for a phone: its name and exam, what it starts with
 * and who can join as small tiles, and what it's for only when wanted.
 */
export function CreateSquadForm({
  exams,
  onCreated,
}: {
  exams: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [describing, setDescribing] = useState(false);
  const [description, setDescription] = useState("");
  const [examId, setExamId] = useState("none");
  const [template, setTemplate] = useState<TemplateKey>("EXAM");
  const [access, setAccess] = useState<SquadAccess>("OPEN");
  const [question, setQuestion] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
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
          onCreated();
          router.push(`/groups/${result.groupId}`);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[3fr_2fr]">
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
        <div className="flex min-w-0 flex-col gap-2">
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
      </div>
      {describing ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="group-description">What it&apos;s for</Label>
          <Textarea
            id="group-description"
            rows={2}
            autoFocus
            value={description}
            maxLength={500}
            placeholder="Daily practice for the Kollam batch"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDescribing(true)}
          className="-my-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-control text-small font-medium text-accent-ink hover:underline md:min-h-8"
        >
          <Plus className="size-4" aria-hidden /> Add what it&apos;s for
        </button>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium">Start with</span>
        <ChoiceTiles
          label="Start with"
          options={TEMPLATES}
          value={template}
          onChange={setTemplate}
        />
      </div>
      <SquadAccessField
        compact
        access={access}
        onAccessChange={setAccess}
        question={question}
        onQuestionChange={setQuestion}
      />
      <Button
        type="submit"
        variant="primary"
        disabled={pending || name.trim().length < 3}
        className="w-full"
      >
        Create squad
      </Button>
    </form>
  );
}
