"use client";

import { useState, type ReactNode } from "react";

import { InviteDialog } from "./invite-dialog";

/**
 * An invite link in a message: on this site it asks "Join this squad?" right here instead
 * of opening a tab; a link to another site (or a modified click) behaves like any link.
 */
export function InviteLink({
  href,
  code,
  className,
  children,
}: {
  href: string;
  code: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className={className}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          if (new URL(href).origin !== window.location.origin) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open ? (
        <InviteDialog code={code} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
