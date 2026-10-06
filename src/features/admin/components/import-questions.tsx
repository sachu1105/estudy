"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { IMPORT_COLUMNS } from "@/lib/questions/questions";

import { importQuestionsAction } from "../actions";

/** Paste CSV or JSON. Imports wait as pending for review unless already checked. */
export function ImportQuestions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [verified, setVerified] = useState(false);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Import</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import questions</DialogTitle>
          <DialogDescription>
            CSV columns: {IMPORT_COLUMNS}. Or a JSON array of questions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="import-raw">Questions</Label>
          <Textarea
            id="import-raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="min-h-48 font-mono text-small"
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-body">
          <Checkbox
            checked={verified}
            onCheckedChange={(v) => setVerified(v === true)}
          />
          I&apos;ve checked these: verify them now
        </label>
        {errors.length > 0 ? (
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-small text-danger-ink">
            {errors.map((e) => (
              <li key={e.line}>
                Line {e.line}: {e.message}
              </li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <Button
            variant="primary"
            disabled={pending || !raw.trim()}
            onClick={() =>
              start(async () => {
                const result = await importQuestionsAction({ raw, verified });
                if (!result.ok) return void toast.error(result.error);
                setErrors(result.errors);
                toast.success(
                  `${result.added} imported${result.errors.length ? `, ${result.errors.length} skipped` : ""}`,
                );
                if (result.errors.length === 0) {
                  setRaw("");
                  setOpen(false);
                }
                router.refresh();
              })
            }
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
