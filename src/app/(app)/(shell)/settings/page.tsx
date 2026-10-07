import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { billingEnabled, planOf } from "@/server/entitlements";
import { notifyService } from "@/server/services/notifications/notify";
import { publicVapidKey } from "@/server/push";
import { fileService } from "@/server/services/pods";
import { profileService } from "@/server/services/profile";
import { NotifyForm } from "@/features/settings/components/notify-form";
import { PrivacyForm } from "@/features/settings/components/privacy-form";

export const metadata: Metadata = { title: "Settings" };

function size(bytes: number) {
  if (!Number.isFinite(bytes)) return "unlimited";
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.max(0, Math.round(bytes / 1024 ** 2))} MB`;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [{ used, limit }, privacy, prefs] = await Promise.all([
    fileService.usage(user),
    profileService.privacy(user),
    notifyService.prefsOf(user),
  ]);
  const percent =
    Number.isFinite(limit) && limit > 0
      ? Math.min(100, (used / limit) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Profile, timezone, notifications and theme."
      />
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="plan"
          className="flex max-w-xl flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <h2 id="plan" className="text-h3">
            Your plan
          </h2>
          <p className="text-body text-ink-muted">
            {billingEnabled()
              ? `You are on ${planOf(user).toLowerCase()}.`
              : `Everything is free during launch, so you have ${planOf(user).toLowerCase()}.`}
          </p>
          <Button asChild variant="secondary" className="self-start">
            <Link href="/settings/plan">See the plans</Link>
          </Button>
        </section>
        <NotifyForm
          initial={prefs}
          pushAvailable={Boolean(publicVapidKey())}
          vapidKey={publicVapidKey()}
        />
        <PrivacyForm
          initial={{
            hideFromGlobalRank: privacy?.hideFromGlobalRank ?? false,
            district: privacy?.district ?? null,
          }}
        />
        <section
          aria-labelledby="storage"
          className="flex max-w-xl flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <h2 id="storage" className="text-h3">
            Storage
          </h2>
          <p className="text-body text-ink-muted">
            {size(used)} of {size(limit)} used by files and photos in your pods.
            The trash counts until it empties.
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label="Storage used"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${percent}%` }}
            />
          </div>
          <Link
            href="/pods/trash"
            className="text-small font-medium text-accent-ink hover:underline"
          >
            Open the trash
          </Link>
        </section>
      </div>
    </>
  );
}
