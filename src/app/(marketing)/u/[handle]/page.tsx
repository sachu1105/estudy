import { Flame, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ProfileBanner } from "@/features/profile/components/profile-banner";
import { site } from "@/lib/site";
import { groupRepository } from "@/server/repositories/group-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { hasSession } from "@/server/auth/session";
import { progressService } from "@/server/services/progress";
import { profileService } from "@/server/services/profile";
import { verifiedIds } from "@/server/services/verified";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await profileService.shared((await params).handle);
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.displayName} on ${site.name}`,
    description:
      profile.bio ??
      `${profile.displayName} is preparing for a competitive exam.`,
    alternates: { canonical: `/u/${profile.handle}` },
    // Shared with whoever has the link, which is not the same as published to search.
    robots: { index: false, follow: false },
  };
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-border px-3 py-2">
      <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="font-mono text-body font-medium text-ink tabular-nums">
        {value}
      </span>
      <span className="text-small text-ink-muted">{label}</span>
    </div>
  );
}

/**
 * A shared profile. Everything here is what the owner chose to share: name, bio, photo,
 * cover, how long their streak is, the XP they have earned and the public squads they
 * are in. Nothing about their plan, pods or email appears, beyond the verified seal
 * that every paid plan shows beside the name.
 */
export default async function PublicProfilePage({ params }: Props) {
  const profile = await profileService.shared((await params).handle);
  if (!profile) notFound();

  const owner = await userRepository.findById(profile.id);
  if (!owner) notFound();

  const [streak, xp, squads, signedIn, verified] = await Promise.all([
    progressService.streak(owner),
    progressRepository.xpTotal(profile.id),
    groupRepository.publicSquadsOf(profile.id),
    hasSession(),
    verifiedIds([profile.id]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16">
      <ProfileBanner
        user={profile}
        verified={verified.has(profile.id)}
        joinedAt={profile.joinedAt}
        stats={
          <div className="flex flex-wrap gap-2">
            <Stat
              icon={Flame}
              value={String(streak.current)}
              label="day streak"
            />
            <Stat
              icon={Sparkles}
              value={xp.toLocaleString("en-IN")}
              label="XP"
            />
            <Stat
              icon={Users}
              value={String(squads.length)}
              label={squads.length === 1 ? "squad" : "squads"}
            />
          </div>
        }
      />

      {squads.length > 0 ? (
        <section aria-labelledby="squads" className="mt-4">
          <h2 id="squads" className="text-h3">
            Open squads
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {squads.map(({ group }) => (
              <li key={group.id}>
                <Link
                  href={`/groups/discover?q=${encodeURIComponent(group.name)}`}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors duration-[120ms] hover:bg-surface-muted"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft font-heading text-small font-medium text-accent-ink"
                  >
                    {group.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {group.name}
                    </span>
                    <span className="block truncate text-small text-ink-muted">
                      {group._count.members}{" "}
                      {group._count.members === 1 ? "member" : "members"}
                      {group.exam ? ` · ${group.exam.name}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!signedIn ? (
        <section className="mt-6 flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5">
          <h2 className="text-h3">Preparing for the same exam?</h2>
          <p className="text-small text-ink-muted">
            {site.name} turns your syllabus into a pod for every subject and a
            plan for every day. Free during launch.
          </p>
          <Button asChild variant="primary">
            <Link href="/register">Get started free</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
