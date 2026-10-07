"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { PromoteForm } from "./promote-form";

type Upload = {
  id: string;
  title: string;
  owner: { email: string } | null;
  exam: { name: string } | null;
  _count: { subjects: number };
};

/**
 * How a syllabus gets into the catalogue: pick a confirmed upload and promote a copy,
 * which then waits for review. Opens by itself when the page was searched (`?q=`).
 */
export function AddSyllabusDialog({
  uploads,
  exams,
  initialQuery,
}: {
  uploads: Upload[];
  exams: { id: string; name: string }[];
  initialQuery: string;
}) {
  const [open, setOpen] = useState(Boolean(initialQuery));
  const [query, setQuery] = useState(initialQuery);
  const shown = uploads.filter((u) =>
    u.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Add a syllabus
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a syllabus</DialogTitle>
            <DialogDescription>
              Upload and confirm it as a normal user first, then promote it
              here. The copy waits for review before anyone sees it.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a confirmed upload"
              aria-label="Search confirmed uploads"
              className="pl-9"
            />
          </div>
          <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
            {shown.map((u) => (
              <li key={u.id} className="flex min-h-14 items-center gap-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    {u.title}
                  </span>
                  <span className="truncate text-small text-ink-muted">
                    {[
                      u.owner?.email,
                      `${u._count.subjects} subjects`,
                      u.exam?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <PromoteForm sourceId={u.id} title={u.title} exams={exams} />
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="py-3 text-body text-ink-muted">
                No confirmed uploads match.
              </li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
