"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";

import { addLinkAction } from "../actions";

/** Paste a link; its title and description are fetched in the background. */
export function LinkDialog({
  open,
  onOpenChange,
  podId,
  topicIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podId: string;
  topicIds: string[];
  onAdded: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const result = await addLinkAction({ podId, url, topicIds });
      if (!result.ok) return setError(result.error);
      setUrl("");
      onOpenChange(false);
      onAdded();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a link</DialogTitle>
            <DialogDescription>
              A website, an article or a video page. We fetch its title for you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="link-url">Link</Label>
            <Input
              id="link-url"
              type="url"
              inputMode="url"
              autoFocus
              placeholder="https://"
              value={url}
              aria-invalid={Boolean(error) || undefined}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
            />
            {error ? <FieldError role="alert">{error}</FieldError> : null}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !url.trim()}
            >
              {pending ? "Adding" : "Add link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
