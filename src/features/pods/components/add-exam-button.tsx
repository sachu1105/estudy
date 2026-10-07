"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadForm,
  type StartedUpload,
} from "@/features/syllabus/components/upload-form";
import { UploadProgress } from "@/features/syllabus/components/upload-progress";

import { ChooseStep } from "./add-exam-choose";

export type AddExamStep = "choose" | "upload";

type Props = {
  /** Upload allowance; `limit` is Infinity when unlimited. */
  uploads: { used: number; limit: number };
  exams: { id: string; name: string }[];
  photos: boolean;
  readerOnline: boolean;
  /** Opened from a link (`?add=upload&exam=`): start there. */
  initialStep?: AddExamStep;
  initialExamId?: string;
  className?: string;
};

/**
 * The way to a new exam pod, all in one dialog: pick a syllabus from the catalogue, or
 * upload one and watch it being read. Closing never loses the upload: it keeps going
 * and shows as a tile on Pods.
 */
export function AddExamButton({ initialStep, className, ...props }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(Boolean(initialStep));
  const [step, setStep] = useState<AddExamStep>(initialStep ?? "choose");
  const [started, setStarted] = useState<StartedUpload | null>(null);

  const close = () => {
    setOpen(false);
    // The tile for a new upload appears; a link's ?add= is dropped.
    if (started || params.has("add")) router.replace(pathname);
    if (started) router.refresh();
    setTimeout(() => {
      setStep("choose");
      setStarted(null);
    }, 300);
  };

  return (
    <>
      <Button
        variant="primary"
        className={className}
        onClick={() => setOpen(true)}
      >
        Add exam
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent className="sm:max-w-lg">
          {started ? (
            <>
              <DialogHeader>
                <DialogTitle>Reading {started.title}</DialogTitle>
                <DialogDescription>
                  We find the subjects and topics. You check them before
                  anything is planned.
                </DialogDescription>
              </DialogHeader>
              <UploadProgress
                started={started}
                readerOnline={props.readerOnline}
                onClose={close}
              />
            </>
          ) : step === "upload" ? (
            <UploadStep
              {...props}
              onBack={initialStep === "upload" ? null : () => setStep("choose")}
              onStarted={setStarted}
            />
          ) : (
            <ChooseStep
              uploads={props.uploads}
              onUpload={() => setStep("upload")}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadStep({
  exams,
  photos,
  initialExamId,
  onBack,
  onStarted,
}: Omit<Props, "uploads" | "readerOnline" | "className"> & {
  onBack: (() => void) | null;
  onStarted: (started: StartedUpload) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload your syllabus</DialogTitle>
        <DialogDescription>
          We read it and find the subjects and topics.{" "}
          <Link
            href="/syllabus/catalogue"
            className="font-medium text-accent-ink hover:underline"
          >
            Is your exam in the catalogue? Pick it instead.
          </Link>
        </DialogDescription>
      </DialogHeader>
      <UploadForm
        exams={exams}
        photos={photos}
        initialExamId={initialExamId}
        onStarted={onStarted}
        actions={
          onBack ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full sm:mr-auto sm:w-auto"
            >
              <ArrowLeft aria-hidden /> Back
            </Button>
          ) : null
        }
      />
    </>
  );
}
