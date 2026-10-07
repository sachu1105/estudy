"use client";

import { Input, Label } from "@/components/ui/input";
import {
  asksToJoin,
  SQUAD_ACCESS,
  type SquadAccess,
} from "@/lib/squads/access";

import { ChoiceRows } from "./choice-rows";

const OPTIONS = (Object.keys(SQUAD_ACCESS) as SquadAccess[]).map((value) => ({
  value,
  label: SQUAD_ACCESS[value].label,
  description: SQUAD_ACCESS[value].description,
}));

/** Who can join, and the question people answer when they ask. */
export function SquadAccessField({
  access,
  onAccessChange,
  question,
  onQuestionChange,
}: {
  access: SquadAccess;
  onAccessChange: (access: SquadAccess) => void;
  question: string;
  onQuestionChange: (question: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-medium">Who can join</span>
      <ChoiceRows
        label="Who can join"
        options={OPTIONS}
        value={access}
        onChange={onAccessChange}
      />
      {asksToJoin(access) && (
        <div className="mt-2 flex flex-col gap-2">
          <Label htmlFor="squad-question">
            Question for people who ask (optional)
          </Label>
          <Input
            id="squad-question"
            value={question}
            maxLength={200}
            placeholder="Which exam are you writing?"
            onChange={(e) => onQuestionChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
