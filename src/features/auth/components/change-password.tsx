"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { changePasswordAction, emailMyResetLinkAction } from "../actions";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas";
import { FormAlert } from "./form-alert";
import { TextField } from "./text-field";

const empty: ChangePasswordInput = {
  currentPassword: "",
  password: "",
  confirm: "",
};

/**
 * Change the password from settings. Forgetting the current one isn't a dead end: the
 * same dialog emails a reset link to the account's own address.
 */
function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: empty,
  });
  const { errors, isSubmitting } = form.formState;

  const close = (next: boolean) => {
    if (!next) {
      form.reset(empty);
      setServerError(null);
    }
    onOpenChange(next);
  };

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    const result = await changePasswordAction(values);
    if (!result.ok) return void setServerError(result.error);
    toast.success(result.message ?? "Password changed");
    close(false);
  }

  const emailLink = () =>
    startSending(async () => {
      const result = await emailMyResetLinkAction();
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.message ?? "Reset link sent");
      close(false);
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form
          method="post"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Your other devices sign out. This one stays signed in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {serverError ? (
              <FormAlert tone="error">{serverError}</FormAlert>
            ) : null}
            <TextField
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              labelAside={
                <button
                  type="button"
                  onClick={emailLink}
                  disabled={sending}
                  className="cursor-pointer text-small text-accent hover:underline disabled:cursor-default disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Forgot it? Email me a link"}
                </button>
              }
              {...form.register("currentPassword")}
            />
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
              error={errors.password?.message}
              {...form.register("password")}
            />
            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={errors.confirm?.message}
              {...form.register("confirm")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save new password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The button that opens the dialog, kept here so the settings page imports one thing. */
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <KeyRound aria-hidden /> Change password
      </Button>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
