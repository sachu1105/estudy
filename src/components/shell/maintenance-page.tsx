import { Wrench } from "lucide-react";

import { Logo } from "@/components/shell/logo";

/** What users see while an admin has maintenance mode on. Staff never see it. */
export function MaintenancePage({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <Wrench className="size-8 text-ink-muted" aria-hidden />
      <div className="flex max-w-md flex-col gap-2">
        <h1>We&apos;re working on the app</h1>
        <p className="text-body text-ink-muted">
          {message ||
            "It's back shortly. Your plan, streak and material are safe."}
        </p>
      </div>
    </div>
  );
}
