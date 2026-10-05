import {
  CalendarSync,
  ClipboardCheck,
  Flame,
  Gauge,
  GraduationCap,
  Trophy,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

import {
  BeginnerFragment,
  GroupsFragment,
  IntensityFragment,
  MockFragment,
  RankFragment,
  ReplanFragment,
  StreakFragment,
  UploadFragment,
} from "./feature-fragments";
import { SectionHeading } from "./section-heading";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  fragment: ReactNode;
  wide?: boolean;
};

const features: Feature[] = [
  {
    icon: Upload,
    title: "Upload any syllabus",
    body: "AI turns your PDF into subjects and topics. You review the tree before anything is planned.",
    fragment: <UploadFragment />,
    wide: true,
  },
  {
    icon: Gauge,
    title: "Set intensity per subject",
    body: "Light, steady or intense, plus how confident you already are.",
    fragment: <IntensityFragment />,
  },
  {
    icon: GraduationCap,
    title: "Beginner mode",
    body: "New to PSC? Fundamentals first, shorter blocks and an explanation on every question.",
    fragment: <BeginnerFragment />,
  },
  {
    icon: ClipboardCheck,
    title: "A mock test after every task",
    body: "Five quick questions on what you just studied. Weak topics get extra revision.",
    fragment: <MockFragment />,
  },
  {
    icon: Flame,
    title: "Daily streak with a weekly freeze",
    body: "Keep the habit going. One missed day a week is forgiven automatically.",
    fragment: <StreakFragment />,
  },
  {
    icon: CalendarSync,
    title: "Weekly re-plan, no overdue pile",
    body: "Missed days never pile up. Every week your plan is rebuilt from where you are.",
    fragment: <ReplanFragment />,
    wide: true,
  },
  {
    icon: Users,
    title: "Study groups",
    body: "Share notes and mock tests, ask doubts and study alongside friends.",
    fragment: <GroupsFragment />,
    wide: true,
  },
  {
    icon: Trophy,
    title: "Group rank and all-India rank",
    body: "See where you stand, or hide and appear as an anonymous aspirant.",
    fragment: <RankFragment />,
    wide: true,
  },
];

export function FeaturesBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24"
    >
      <Reveal>
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything between today and exam day"
        >
          One plan that adapts to you, a test after every task, and people to
          study with.
        </SectionHeading>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Reveal
            key={feature.title}
            className={cn(
              "flex flex-col gap-4 rounded-card border border-border bg-surface p-5 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md",
              feature.wide && "lg:col-span-2",
            )}
          >
            <span className="grid size-10 place-items-center rounded-control bg-accent-soft text-accent-ink">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h3>{feature.title}</h3>
              <p className="text-small text-ink-muted">{feature.body}</p>
            </div>
            <div className="mt-auto">{feature.fragment}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
