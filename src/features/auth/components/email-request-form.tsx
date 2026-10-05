"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

import type { ActionResult, EmailOnlyInput } from "../schemas";
import { emailOnlySchema } from "../schemas";
import { FormAlert } from "./form-alert";
import { TextField } from "./text-field";

type EmailRequestFormProps = {
  action: (input: EmailOnlyInput) => Promise<ActionResult>;
  submitLabel: string;
  pendingLabel: string;
  defaultEmail?: string;
  /** Secondary forms (like "resend") must not compete with the page's one accent button. */
  variant?: "primary" | "secondary";
};

/** One email field and a button. Used for password reset requests and resending verification. */
export function EmailRequestForm({
  action,
  submitLabel,
  pendingLabel,
  defaultEmail = "",
  variant = "primary",
}: EmailRequestFormProps) {
  // Disabled until hydrated: an early tap would otherwise do a native GET submit and put
  // the form values (passwords included) in the URL.
  const hydrated = useHydrated();
  const [result, setResult] = useState<ActionResult | null>(null);
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: defaultEmail },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: EmailOnlyInput) {
    setResult(await action(values));
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {result ? (
        <FormAlert tone={result.ok ? "success" : "error"}>
          {result.ok ? result.message : result.error}
        </FormAlert>
      ) : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <Button
        type="submit"
        variant={variant}
        size="lg"
        className="w-full"
        disabled={!hydrated || isSubmitting}
      >
        {isSubmitting ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
