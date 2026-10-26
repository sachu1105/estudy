"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { buildSyllabusAction } from "../actions";
import { useSyllabusFile } from "../use-syllabus-file";
import { ExamTitleFields } from "./exam-title-fields";
import {
  ReadMethodPicker,
  type CatalogueReader,
  type ReadMethod,
} from "./read-method";

const DOCS =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PHOTOS = ",image/jpeg,image/png,image/webp";

/**
 * The admin's syllabus builder, step one: which exam, the syllabus (pasted, or filled from
 * a file to check first) and how to read it: by its headings and lists, or by the AI while
 * it is switched on. The next screen is where the subjects and topics are fixed.
 */
export function BuildSyllabusForm({
  exams,
  examId: initialExam,
  reader,
}: {
  exams: { id: string; name: string }[];
  examId: string | null;
  reader: CatalogueReader;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [examId, setExamId] = useState(initialExam ?? "");
  const [title, setTitle] = useState(
    exams.find((e) => e.id === initialExam)?.name ?? "",
  );
  const [text, setText] = useState("");
  const [method, setMethod] = useState<ReadMethod>("rules");
  const ai = reader.on && method === "ai";
  const readsPages = reader.on && reader.readsPages;
  const source = useSyllabusFile({ setText, keepFile: ai, readsPages });
  const [pending, start] = useTransition();

  const readByAi = async () => {
    const body = new FormData();
    body.set("examId", examId);
    body.set("title", title);
    if (source.file) body.set("file", source.file);
    else body.set("text", text);
    const response = await fetch("/api/admin/syllabus-read", {
      method: "POST",
      body,
    });
    const json = (await response.json().catch(() => ({}))) as {
      id?: string;
      reused?: boolean;
      error?: string;
    };
    if (!response.ok || !json.id)
      return void toast.error(json.error ?? "Couldn't start the reading.");
    toast.success(json.reused ? "Read before: reused" : "Reading started");
    router.push(`/admin/catalogue/${json.id}`);
  };

  const build = (withText: boolean) =>
    start(async () => {
      if (withText && ai) return readByAi();
      const result = await buildSyllabusAction({
        examId,
        title,
        text: withText ? text : null,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(withText ? "Syllabus read" : "Blank syllabus started");
      router.push(`/admin/catalogue/${result.id}`);
    });

  const ready = (ai && source.file) || text.trim().length >= 40;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        build(true);
      }}
    >
      <ExamTitleFields
        exams={exams}
        examId={examId}
        title={title}
        onExam={(id) => {
          setExamId(id);
          if (!title) setTitle(exams.find((e) => e.id === id)?.name ?? "");
        }}
        onTitle={setTitle}
      />

      <div className="flex flex-col gap-2">
        <Label>How to read it</Label>
        <ReadMethodPicker reader={reader} value={method} onChange={setMethod} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="build-text">Syllabus text</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={source.reading}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp aria-hidden />{" "}
            {source.reading ? "Reading file" : "Fill from a file"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={ai && readsPages ? DOCS + PHOTOS : DOCS}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void source.pick(file);
              e.target.value = "";
            }}
          />
        </div>
        <Textarea
          id="build-text"
          rows={14}
          value={text}
          maxLength={200_000}
          onChange={(e) => {
            setText(e.target.value);
            source.clearFile();
          }}
          placeholder={
            "Part I: General knowledge (50 marks)\nHistory: Kerala renaissance, freedom struggle\n..."
          }
          className="font-mono text-base md:text-small"
        />
        {ai ? (
          <p className="text-small text-ink-muted">
            {source.file
              ? `The AI reads ${source.file.name} itself. Edit the text to have it read your text instead.`
              : "The AI reads the text above."}
          </p>
        ) : null}
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
          disabled={pending || source.reading || !examId || !ready}
        >
          {pending
            ? "Reading"
            : ai
              ? "Read with AI"
              : "Read subjects and topics"}
        </Button>
      </div>
    </form>
  );
}
