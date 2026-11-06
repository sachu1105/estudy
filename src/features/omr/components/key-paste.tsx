"use client";

import { ClipboardPaste } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseKey } from "@/lib/omr/key";
import { OPTION_LETTERS, type Shape } from "@/lib/omr/marks";

/**
 * The fast way in: paste or type the whole key, as letters in order or numbered. It
 * fills the questions it names and leaves the rest as they are.
 */
export function KeyPaste({
  shape,
  onFill,
}: {
  shape: Shape;
  onFill: (entries: Map<number, number>) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const last = OPTION_LETTERS[shape.options - 1];

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseKey(text, shape);
        if (!parsed.ok) return setError(parsed.error);
        setError(null);
        setText("");
        onFill(parsed.entries);
      }}
    >
      <Label htmlFor={id}>Paste the key</Label>
      <Textarea
        id={id}
        rows={3}
        value={text}
        aria-invalid={error !== null || undefined}
        aria-describedby={`${id}-hint`}
        placeholder="ACDBB CADBA... or 1-A 2-C 3-D"
        onChange={(e) => setText(e.target.value)}
        className="font-mono"
      />
      <p
        id={`${id}-hint`}
        className="text-small text-ink-muted"
        role={error ? "alert" : undefined}
      >
        {error ??
          `Letters A to ${last} in order, or numbered. Two letters (1-AB) accept either; X cancels a question.`}
      </p>
      <Button type="submit" className="self-start" disabled={!text.trim()}>
        <ClipboardPaste aria-hidden /> Fill the key
      </Button>
    </form>
  );
}
