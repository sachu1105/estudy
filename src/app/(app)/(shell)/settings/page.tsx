import { LogOut, Shield, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { ChangePasswordButton } from "@/features/auth/components/change-password";
import { CoverButton } from "@/features/profile/components/cover-button";
import { EditProfileButton } from "@/features/profile/components/profile-editor";
import { ProfileBanner } from "@/features/profile/components/profile-banner";
import { FindableSwitch } from "@/features/profile/components/findable-switch";
import { ShareProfile } from "@/features/profile/components/share-profile";
import { UsernameRow } from "@/features/profile/components/username-row";
import { NotifyForm } from "@/features/settings/components/notify-form";
import {
  SettingsGroup,
  SettingsRow,
} from "@/features/settings/components/settings-section";
import { requireUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { billingEnabled, planOf } from "@/server/entitlements";
import { notifyService } from "@/server/services/notifications/notify";
import { fileService } from "@/server/services/pods";
import { friendService } from "@/server/services/friends";
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
  // Accounts from before everyone had a username get one here, as on Friends.
  await friendService.ensureHandle(user);
  const [{ used, limit }, prefs, profile] = await Promise.all([
    fileService.usage(user),
    notifyService.prefsOf(user),
    profileService.get(user),
  ]);
  const percent =
    Number.isFinite(limit) && limit > 0
      ? Math.min(100, (used / limit) * 100)
      : 0;

  const name = planOf(user).toLowerCase();
  const plan = name[0]!.toUpperCase() + name.slice(1);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-8">
        {profile ? (
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
        ) : null}

        {profile ? (
          <SettingsGroup title="Friends and privacy">
            <UsernameRow
              handle={profile.handle}
              profilePublic={profile.profilePublic}
            />
            <FindableSwitch initial={profile.findable} />
            <ShareProfile
              initial={profile.profilePublic}
              handle={profile.handle}
              origin={env.APP_URL}
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup
          title="Reminders"
          description="Three at most, never in quiet hours."
        >
          <NotifyForm
            initial={prefs}
            pushAvailable={Boolean(publicVapidKey())}
            vapidKey={publicVapidKey()}
          />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow
            label="Plan"
            hint={billingEnabled() ? plan : `${plan} · free during launch`}
            control={
              <Button asChild variant="secondary" size="sm">
                <Link href="/settings/plan">See the plans</Link>
              </Button>
            }
          />
          <SettingsRow
            label="Storage"
            hint={`${size(used)} of ${size(limit)} · the trash counts until it empties`}
            control={
              <Button asChild variant="ghost" size="sm">
                <Link href="/pods/trash">
                  <Trash2 aria-hidden /> Trash
                </Link>
              </Button>
            }
            below={
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
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
            }
          />
          <SettingsRow label="Password" control={<ChangePasswordButton />} />
          {/* The way out on a phone, where there's no avatar menu in the top bar. */}
          <SettingsRow
            label="Signed in as"
            stack
            hint={user.email}
            control={
              <>
                {user.role !== "USER" ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">
                      <Shield aria-hidden /> Admin panel
                    </Link>
                  </Button>
                ) : null}
                <form action={logoutAction}>
                  <Button type="submit" variant="secondary" size="sm">
                    <LogOut aria-hidden /> Log out
                  </Button>
                </form>
              </>
            }
          />
        </SettingsGroup>
      </div>
    </div>
  );
}
