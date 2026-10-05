"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  fieldClasses,
} from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils/cn";

import { submitPastedTextAction } from "../actions";
import { uploadSyllabusFile } from "../api";
import { FileDrop } from "./file-drop";

const MAX_BYTES = 15 * 1024 * 1024;
const DRAFT_KEY = "syllabus-paste-draft";
type Mode = "file" | "text";

function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(text: string) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

const titleFromFile = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 120);

export function UploadForm({
  exams,
  initialExamId = "",
  photos = false,
}: {
  exams: { id: string; name: string }[];
  initialExamId?: string;
  /** Photos of the syllabus can be read. */
  photos?: boolean;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  // Pasted text survives a refresh or an accidental back (friction rules: autosave drafts).
  // The textarea only renders after a tap on "Paste text", so this can't mismatch hydration.
  const [text, setText] = useState(readDraft);
  const [title, setTitle] = useState("");
  const [examId, setExamId] = useState(
    exams.some((e) => e.id === initialExamId) ? initialExamId : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const chooseFile = (next: File | null) => {
    setError(null);
    if (next && next.size > MAX_BYTES) {
      setError(
        "This file is over 15 MB. Upload only the syllabus pages, or paste the text.",
      );
      return;
    }
    setFile(next);
    if (next && !title) setTitle(titleFromFile(next.name));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the syllabus a title.");
    if (mode === "file" && !file) return setError("Choose a file to upload.");
    const meta = { title, examId: examId || null };
    startTransition(async () => {
      try {
        if (mode === "file") {
          setProgress(0);
          const { versionId } = await uploadSyllabusFile(
            file!,
            meta,
            setProgress,
          );
          router.push(`/syllabus/${versionId}`);
        } else {
          const result = await submitPastedTextAction({ ...meta, text });
          if (!result.ok) return setError(result.error);
          writeDraft("");
          router.push(`/syllabus/${result.versionId}`);
        }
      } catch (e) {
        setError((e as Error).message);
        setProgress(null);
      }
    });
  };

  const busyLabel =
    progress !== null && progress < 1
      ? `Uploading ${Math.round(progress * 100)}%`
      : "Checking the file";

  return (
    <form
      method="post"
      onSubmit={submit}
      className="flex flex-col gap-6"
      noValidate
    >
      <SegmentedControl<Mode>
        ariaLabel="How to add the syllabus"
        value={mode}
        onValueChange={(next) => {
          setMode(next);
          setError(null);
        }}
        options={[
          { value: "file", label: "Upload a file" },
          { value: "text", label: "Paste text" },
        ]}
        className="self-start"
      />

      {mode === "file" ? (
        <FileDrop
          photos={photos}
          file={file}
          onFile={chooseFile}
          disabled={pending}
          invalid={Boolean(error && !file)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="syllabus-text">Syllabus text</Label>
          <Textarea
            id="syllabus-text"
            rows={12}
            value={text}
            disabled={pending}
            placeholder="Paste the subjects and the topics under each one."
            onChange={(e) => {
              setText(e.target.value);
              writeDraft(e.target.value);
            }}
          />
          <FieldHint>
            Your text is kept on this device until you send it.
          </FieldHint>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="syllabus-title">Title</Label>
          <Input
            id="syllabus-title"
            value={title}
            maxLength={120}
            disabled={pending}
            placeholder="Kerala PSC LDC 2026"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="syllabus-exam">Exam (optional)</Label>
          <select
            id="syllabus-exam"
            value={examId}
            disabled={pending}
            onChange={(e) => setExamId(e.target.value)}
            className={cn(fieldClasses, "appearance-auto")}
          >
            <option value="">Not listed</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <FieldError role="alert">{error}</FieldError> : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!hydrated || pending}
        className="w-full sm:w-auto sm:self-start"
      >
        {pending ? (mode === "file" ? busyLabel : "Sending") : "Read syllabus"}
      </Button>
    </form>
  );
}
