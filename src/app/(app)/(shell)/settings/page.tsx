import { Bell, CreditCard, HardDrive, Link2, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverButton } from "@/features/profile/components/cover-button";
import { EditProfileButton } from "@/features/profile/components/profile-editor";
import { ProfileBanner } from "@/features/profile/components/profile-banner";
import { ShareProfile } from "@/features/profile/components/share-profile";
import { NotifyForm } from "@/features/settings/components/notify-form";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { requireUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { billingEnabled, planOf } from "@/server/entitlements";
import { notifyService } from "@/server/services/notifications/notify";
import { fileService } from "@/server/services/pods";
import { profileService } from "@/server/services/profile";
import { publicVapidKey } from "@/server/push";

export const metadata: Metadata = { title: "Settings" };

function size(bytes: number) {
  if (!Number.isFinite(bytes)) return "unlimited";
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.max(0, Math.round(bytes / 1024 ** 2))} MB`;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [{ used, limit }, prefs, profile] = await Promise.all([
    fileService.usage(user),
    notifyService.prefsOf(user),
    profileService.get(user),
  ]);
  const percent =
    Number.isFinite(limit) && limit > 0
      ? Math.min(100, (used / limit) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Settings"
        description="Your profile, what you share, reminders and storage."
      />

      <div className="flex flex-col gap-4">
        {profile ? (
          <>
            <ProfileBanner
              user={profile}
              joinedAt={profile.joinedAt}
              overlay={
                <CoverButton
                  userId={user.id}
                  selection={profile.coverSelection}
                  cover={profile.cover}
                />
              }
              actions={
                <EditProfileButton
                  initial={{
                    displayName: profile.displayName,
                    bio: profile.bio,
                    avatarUrl: profile.avatarUrl,
                    hasAvatar: profile.hasAvatar,
                  }}
                />
              }
            />

            <SettingsSection
              title="Sharing"
              description="Your profile is private until you turn this on."
              icon={<Link2 className="size-4" />}
              actions={
                profile.profilePublic ? (
                  <Badge tone="outline">Shared</Badge>
                ) : null
              }
            >
              <ShareProfile
                origin={env.APP_URL}
                initial={{
                  profilePublic: profile.profilePublic,
                  handle: profile.handle,
                  suggestedHandle: profile.suggestedHandle,
                }}
              />
            </SettingsSection>
          </>
        ) : null}

        <SettingsSection
          title="Your plan"
          description={
            billingEnabled()
              ? `You are on ${planOf(user).toLowerCase()}.`
              : `Everything is free during launch, so you have ${planOf(user).toLowerCase()}.`
          }
          icon={<CreditCard className="size-4" />}
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/settings/plan">See the plans</Link>
            </Button>
          }
        />

        <SettingsSection
          title="Reminders"
          description="Three, at most, and never during your quiet hours."
          icon={<Bell className="size-4" />}
        >
          <NotifyForm
            initial={prefs}
            pushAvailable={Boolean(publicVapidKey())}
            vapidKey={publicVapidKey()}
          />
        </SettingsSection>

        <SettingsSection
          title="Storage"
          description={`${size(used)} of ${size(limit)} used by files and photos in your pods. The trash counts until it empties.`}
          icon={<HardDrive className="size-4" />}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/pods/trash">
                <Trash2 aria-hidden /> Trash
              </Link>
            </Button>
          }
        >
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
        </SettingsSection>
      </div>
    </div>
  );
}
