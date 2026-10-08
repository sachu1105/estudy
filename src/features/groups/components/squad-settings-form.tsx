"use client";

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
  accessOf,
  asksToJoin,
  SQUAD_ACCESS,
  type JoinMode,
} from "@/lib/squads/access";

import { updateGroupAction } from "../actions";
import { SquadAccessField } from "./squad-access-field";

const NONE = "none";

/** An admin edits what the squad is and who can get in. */
export function SquadSettingsForm({
  group,
  exams,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    examId: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    joinMode: JoinMode;
    joinQuestion: string | null;
  };
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [examId, setExamId] = useState(group.examId ?? NONE);
  const [access, setAccess] = useState(accessOf(group));
  const [question, setQuestion] = useState(group.joinQuestion ?? "");
  const [pending, start] = useTransition();

  return (
    <form
      className="flex max-w-xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await updateGroupAction({
            groupId: group.id,
            name,
            description,
            examId: examId === NONE ? null : examId,
            visibility: SQUAD_ACCESS[access].visibility,
            joinMode: SQUAD_ACCESS[access].joinMode,
            joinQuestion: asksToJoin(access) ? question : "",
          });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Squad saved");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="squad-name">Name</Label>
        <Input
          id="squad-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="squad-description">What it&apos;s for (optional)</Label>
        <Textarea
          id="squad-description"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="squad-exam">Exam (optional)</Label>
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger id="squad-exam">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Any exam</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SquadAccessField
        access={access}
        onAccessChange={setAccess}
        question={question}
        onQuestionChange={setQuestion}
      />
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        disabled={pending || name.trim().length < 3}
      >
        Save changes
      </Button>
    </form>
  );
}
