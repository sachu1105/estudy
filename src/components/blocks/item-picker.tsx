"use client";

import { Search } from "lucide-react";
import {
  cloneElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

export type PickerItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
};

type Props = {
  /** The button that opens it. */
  trigger: ReactElement;
  title: string;
  description?: string;
  items: PickerItem[];
  onPick: (id: string) => void;
  /** Shown when there is nothing to pick. */
  empty: string;
  /** Where it opens beside the trigger on md+ (a chat box opens upward). */
  side?: "top" | "bottom";
  align?: "start" | "end";
  disabled?: boolean;
};

/**
 * Pick one thing from a list: a small panel beside the button on md+, a bottom sheet
 * with a handle on phones. Long lists get a search box.
 */
export function ItemPicker({
  trigger,
  side = "bottom",
  align = "start",
  ...body
}: Props) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const pick = (id: string) => {
    setOpen(false);
    body.onPick(id);
  };
  // One trigger whatever the width; only the panel it opens differs.
  const opener = cloneElement(
    trigger as ReactElement<Record<string, unknown>>,
    {
      onClick: () => setOpen((o) => !o),
      "aria-expanded": open,
      "aria-haspopup": "dialog",
    },
  );

  return (
    <>
      <Popover open={open && wide} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <span ref={anchor} className="inline-flex">
            {opener}
          </span>
        </PopoverAnchor>
        <PopoverContent
          side={side}
          align={align}
          // The trigger toggles it; a click there isn't a click outside.
          onInteractOutside={(e) => {
            if (anchor.current?.contains(e.target as Node)) e.preventDefault();
          }}
          className="flex max-h-[min(440px,70dvh)] w-[360px] flex-col overflow-hidden"
        >
          <PickerBody {...body} onPick={pick} heading="h3" />
        </PopoverContent>
      </Popover>
      <Sheet open={open && !wide} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[75dvh] gap-0 rounded-t-[20px] p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <span
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
          />
          <PickerBody {...body} onPick={pick} heading="sheet" />
        </SheetContent>
      </Sheet>
    </>
  );
}

function PickerBody({
  title,
  description,
  items,
  onPick,
  empty,
  disabled,
  heading,
}: Omit<Props, "trigger" | "side" | "align"> & { heading: "h3" | "sheet" }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? items.filter((i) =>
        `${i.title} ${i.subtitle ?? ""}`.toLowerCase().includes(q),
      )
    : items;

  return (
    <>
      <div className="flex flex-col gap-0.5 px-4 pt-4 pr-12 pb-3">
        {heading === "sheet" ? (
          <>
            <SheetTitle className="text-h3">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="text-small">
                {description}
              </SheetDescription>
            ) : null}
          </>
        ) : (
          <>
            <h3 className="text-h3">{title}</h3>
            {description ? (
              <p className="text-small text-ink-muted">{description}</p>
            ) : null}
          </>
        )}
      </div>
      {items.length > 5 ? (
        <label className="mx-4 mb-2 flex h-11 items-center gap-2 rounded-control bg-surface-muted px-3 md:h-9">
          <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) {
                e.preventDefault();
                onPick(shown[0].id);
              }
            }}
            placeholder="Search"
            aria-label={`Search ${title.toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-subtle md:text-body"
          />
        </label>
      ) : null}
      {shown.length === 0 ? (
        <p className="px-4 pb-4 text-small text-ink-muted">
          {items.length ? "Nothing matches." : empty}
        </p>
      ) : (
        <ul className="flex-1 scrollbar-thin overflow-y-auto px-2 pb-2">
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(item.id)}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-[120ms] hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted [&_svg]:size-4">
                  {item.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">{item.title}</span>
                  {item.subtitle ? (
                    <span className="truncate text-small text-ink-muted">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
