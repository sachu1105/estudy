"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/lib/use-hydrated";

import { submitPastedTextAction } from "../actions";
import { uploadSyllabusFile } from "../api";
import { ExamChips } from "./exam-chips";
import { FileDrop } from "./file-drop";

const MAX_BYTES = 15 * 1024 * 1024;
const DRAFT_KEY = "syllabus-paste-draft";
type Mode = "file" | "text";

export type StartedUpload = { versionId: string; jobId: string; title: string };

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

/**
 * A file or pasted text, which exam it is for, and a name. Sends it to be read and
 * hands back the new syllabus and its job; the caller shows the reading.
 */
export function UploadForm({
  exams,
  initialExamId = "",
  photos = false,
  onStarted,
  actions,
}: {
  exams: { id: string; name: string }[];
  initialExamId?: string;
  /** Photos of the syllabus can be read. */
  photos?: boolean;
  onStarted: (started: StartedUpload) => void;
  /** Shown beside the submit button (a way back). */
  actions?: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  // Pasted text survives a refresh or an accidental close (friction rules: autosave
  // drafts). The textarea only renders after "Paste text", so hydration can't mismatch.
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
    if (mode === "file" && !file) return setError("Choose a file to upload.");
    if (mode === "text" && !text.trim())
      return setError("Paste the syllabus text first.");
    if (!title.trim()) return setError("Give the syllabus a name.");
    const meta = { title, examId: examId || null };
    startTransition(async () => {
      try {
        if (mode === "file") {
          setProgress(0);
          const started = await uploadSyllabusFile(file!, meta, setProgress);
          onStarted({ ...started, title });
        } else {
          const result = await submitPastedTextAction({ ...meta, text });
          if (!result.ok) return setError(result.error);
          writeDraft("");
          onStarted({ ...result, title });
        }
      } catch (e) {
        setError((e as Error).message);
        setProgress(null);
      }
    });
  };

  const busyLabel =
    mode === "text"
      ? "Sending"
      : progress !== null && progress < 1
        ? `Uploading ${Math.round(progress * 100)}%`
        : "Checking the file";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
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
            rows={7}
            value={text}
            disabled={pending}
            placeholder="Paste the subjects and the topics under each one."
            onChange={(e) => {
              setText(e.target.value);
              writeDraft(e.target.value);
            }}
          />
          <FieldHint>Kept on this device until you send it.</FieldHint>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span id="exam-chips-label" className="text-small font-medium text-ink">
          Exam
        </span>
        <ExamChips
          exams={exams}
          value={examId}
          onChange={setExamId}
          disabled={pending}
        />
      </div>

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

      {error ? <FieldError role="alert">{error}</FieldError> : null}

      {progress !== null && pending ? (
        <div
          role="progressbar"
          aria-label="Uploading"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-[120ms]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {actions}
        <Button
          type="submit"
          variant="primary"
          disabled={!hydrated || pending}
          className="w-full sm:w-auto"
        >
          {pending ? busyLabel : "Read syllabus"}
        </Button>
      </div>
    </form>
  );
}
