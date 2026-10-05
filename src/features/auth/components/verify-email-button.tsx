"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

import { verifyEmailAction } from "../actions";
import { FormAlert } from "./form-alert";

// Verification needs a click: email scanners that prefetch links can't consume the token.
export function VerifyEmailButton({ token }: { token: string }) {
  // Disabled until hydrated: an early tap would otherwise do a native GET submit and put
  // the form values (passwords included) in the URL.
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function verify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailAction({ token });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={verify}
        disabled={!hydrated || pending}
      >
        {pending ? "Verifying…" : "Verify email"}
      </Button>
    </div>
  );
}
