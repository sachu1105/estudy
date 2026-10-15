"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

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

import { buildSyllabusAction } from "../actions";

/**
 * The admin's syllabus builder, step one: which exam, and the syllabus text (pasted, or
 * pulled out of a PDF or Word file to check first). The text is read by its headings and
 * lists, with no AI; the next screen is where the subjects and topics are fixed.
 */
export function BuildSyllabusForm({
  exams,
  examId: initialExam,
}: {
  exams: { id: string; name: string }[];
  examId: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [examId, setExamId] = useState(initialExam ?? "");
  const [title, setTitle] = useState(
    exams.find((e) => e.id === initialExam)?.name ?? "",
  );
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();

  async function readFile(file: File) {
    setReading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/syllabus-text", {
        method: "POST",
        body,
      });
      const json = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!response.ok || !json.text)
        return void toast.error(json.error ?? "Couldn't read that file.");
      setText(json.text);
      toast.success("Text added. Check it, then read it");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const build = (withText: boolean) =>
    start(async () => {
      const result = await buildSyllabusAction({
        examId,
        title,
        text: withText ? text : null,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(withText ? "Syllabus read" : "Blank syllabus started");
      router.push(`/admin/catalogue/${result.id}`);
    });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        build(true);
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="build-exam">Exam</Label>
          <Select
            value={examId}
            onValueChange={(id) => {
              setExamId(id);
              if (!title) setTitle(exams.find((e) => e.id === id)?.name ?? "");
            }}
          >
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="LDC 2026 (Kerala PSC)"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="build-text">Syllabus text</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={reading}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp aria-hidden />{" "}
            {reading ? "Reading file" : "Fill from a file"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </div>
        <Textarea
          id="build-text"
          rows={14}
          value={text}
          maxLength={200_000}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Part I: General knowledge (50 marks)\nHistory: Kerala renaissance, freedom struggle\n..."
          }
          className="font-mono text-base md:text-small"
        />
        <p className="text-small text-ink-muted">
          Headings (Part I, (i) History, Module 1, a line ending in a colon)
          become subjects; the lists under them become topics. Stated marks set
          topic weights. You fix everything on the next screen.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          disabled={pending || !examId}
          onClick={() => build(false)}
        >
          Start blank instead
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={pending || !examId || text.trim().length < 40}
        >
          {pending ? "Reading" : "Read subjects and topics"}
        </Button>
      </div>
    </form>
  );
}
