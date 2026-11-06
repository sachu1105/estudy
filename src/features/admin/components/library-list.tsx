"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { rupees } from "@/lib/pricing/pricing";

import { setLibraryAction } from "../library-actions";
import { LibraryForm, type LibraryDraft } from "./library-form";
import { TakeDownButton } from "./take-down-button";
import { useAdminRun } from "./use-admin-run";

type Paper = { id: string; title: string; questions: number; keyed: number };
export type LibraryEntry = LibraryDraft & {
  id: string;
  papers: number;
  published: boolean;
  holders: number;
};

const EMPTY: LibraryDraft = {
  id: null,
  title: "",
  description: "",
  paperIds: [],
  rupees: null,
  includedIn: [],
};

/**
 * Admin > Papers: every library entry with its state, price, plans and how many have
 * it, editable in place; and a new one at the top.
 */
export function LibraryList({
  entries,
  papers,
}: {
  entries: LibraryEntry[];
  papers: Paper[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { run, pending } = useAdminRun();

  return (
    <div className="flex flex-col gap-4">
      {editing === "new" ? (
        <Card className="p-5">
          <h2 className="mb-4 font-heading text-h3">New in the Store</h2>
          <LibraryForm
            papers={papers}
            initial={EMPTY}
            onDone={() => setEditing(null)}
          />
        </Card>
      ) : (
        <Button
          variant="primary"
          className="self-start"
          onClick={() => setEditing("new")}
        >
          <Plus aria-hidden /> New paper or bundle
        </Button>
      )}
      {entries.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-small text-ink-muted">
          Nothing in the Store yet. Upload papers in Tests with their keys, then
          list them here, one at a time or as a bundle.
        </p>
      ) : (
        <ul aria-label="Library" className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-col gap-3 p-4">
                {editing === e.id ? (
                  <LibraryForm
                    papers={papers}
                    initial={e}
                    onDone={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 flex-1 truncate font-heading text-h3">
                        {e.title}
                      </h2>
                      <Badge tone={e.published ? "accent" : "neutral"}>
                        {e.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-small text-ink-muted">
                      {e.papers} paper{e.papers === 1 ? "" : "s"} ·{" "}
                      {e.rupees === null ? "Free" : rupees(e.rupees * 100)}
                      {e.includedIn.length
                        ? ` · free with ${e.includedIn.map((p) => (p === "PRO" ? "Pro" : "Elite")).join(" and ")}`
                        : ""}{" "}
                      · {e.holders} {e.holders === 1 ? "has" : "have"} it
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={pending}
                        onClick={() => setEditing(e.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              setLibraryAction({
                                id: e.id,
                                op: e.published ? "unpublish" : "publish",
                              }),
                            e.published
                              ? "Back to a draft."
                              : "Published in the Store.",
                          )
                        }
                      >
                        {e.published ? "Unpublish" : "Publish"}
                      </Button>
                      <TakeDownButton
                        title={e.title}
                        disabled={pending}
                        onConfirm={() =>
                          run(
                            () => setLibraryAction({ id: e.id, op: "remove" }),
                            "Taken down.",
                          )
                        }
                      />
                    </div>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
