"use client";

import { Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The builder's first two fields: which exam the syllabus is for, and its title. */
export function ExamTitleFields({
  exams,
  examId,
  title,
  onExam,
  onTitle,
}: {
  exams: { id: string; name: string }[];
  examId: string;
  title: string;
  onExam: (id: string) => void;
  onTitle: (title: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="build-exam">Exam</Label>
        <Select value={examId} onValueChange={onExam}>
          <SelectTrigger id="build-exam">
            <SelectValue placeholder="Pick the exam" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="build-title">Title users see</Label>
        <Input
          id="build-title"
          value={title}
          maxLength={200}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="LDC 2026 (Kerala PSC)"
        />
      </div>
    </div>
  );
}
