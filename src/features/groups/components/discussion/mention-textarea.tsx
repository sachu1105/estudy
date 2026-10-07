"use client";

import { useId, useRef, useState, type ComponentProps } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { Mention } from "@/lib/markdown/markdown";
import { cn } from "@/lib/utils/cn";

type Props = Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  members: Mention[];
  /** Called with each person picked from the list. */
  onMention: (person: Mention) => void;
};

/** A textarea that offers group members after "@", by keyboard or tap. */
export function MentionTextarea({
  value,
  onValueChange,
  members,
  onMention,
  className,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const matches =
    query === null
      ? []
      : members
          .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);
  const open = matches.length > 0;

  const track = (text: string, caret: number) => {
    const word = text.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,30})$/);
    setQuery(word ? word[1] : null);
    setActive(0);
  };

  const pick = (person: Mention) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const start = value.slice(0, caret).lastIndexOf("@");
    const next = `${value.slice(0, start)}@${person.name} ${value.slice(caret)}`;
    onValueChange(next);
    onMention(person);
    setQuery(null);
    const at = start + person.name.length + 2;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at, at);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onValueChange(e.target.value);
          track(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + step + matches.length) % matches.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setQuery(null);
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className={className}
        {...props}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="People to mention"
        className={cn(
          "absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-control border border-border bg-surface shadow-md",
          !open && "hidden",
        )}
      >
        {matches.map((m, i) => (
          <li
            key={m.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(m);
            }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center px-3 text-body",
              i === active && "bg-accent-soft text-accent-ink",
            )}
          >
            @{m.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
