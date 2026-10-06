"use client";

import { Command } from "cmdk";
import { Search, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

export type CommandItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  keywords?: string[];
  onSelect: () => void;
};

export type CommandGroup = { heading: string; items: CommandItem[] };

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  /** When given, what's typed can also be searched for ("Search pods for ..."). */
  search?: { label: string; onSearch: (query: string) => void };
};

/** Opens with Cmd/Ctrl+K anywhere. The caller owns `open` and the items. */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  search,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function run(item: CommandItem) {
    onOpenChange(false);
    item.onSelect();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in"
      contentClassName={cn(
        "fixed top-[12vh] left-1/2 z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2 overflow-hidden",
        "rounded-card border border-border bg-surface shadow-lg data-[state=open]:animate-pop-in",
      )}
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search or jump to…"
        className="h-14 w-full border-b border-border bg-transparent px-5 text-body text-ink outline-none"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-body text-ink-muted">
          Nothing matches. Try another word.
        </Command.Empty>
        {search && query.trim() ? (
          <Command.Item
            forceMount
            value={`__search ${query}`}
            onSelect={() => {
              onOpenChange(false);
              search.onSearch(query.trim());
            }}
            className="flex h-10 cursor-pointer items-center gap-3 rounded-chip px-3 text-body text-ink data-[selected=true]:bg-surface-muted"
          >
            <Search className="size-4 text-ink-muted" aria-hidden />
            <span className="truncate">
              {search.label} &ldquo;{query.trim()}&rdquo;
            </span>
          </Command.Item>
        ) : null}
        {groups.map((group) => (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:uppercase"
          >
            {group.items.map((item) => (
              <Command.Item
                key={item.id}
                value={`${group.heading} ${item.label}`}
                keywords={item.keywords}
                onSelect={() => run(item)}
                className="flex h-10 cursor-pointer items-center gap-3 rounded-chip px-3 text-body text-ink data-[selected=true]:bg-surface-muted"
              >
                {item.icon ? (
                  <item.icon className="size-4 text-ink-muted" aria-hidden />
                ) : null}
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
