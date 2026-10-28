import { Reveal } from "@/components/ui/reveal";

import { FeatureCell, type Feature } from "./feature-cell";
import { PaperScene } from "./feature-scenes/paper-scene";
import { PlanScene } from "./feature-scenes/plan-scene";
import { PodsScene } from "./feature-scenes/pods-scene";
import { SquadScene } from "./feature-scenes/squad-scene";
import { Band } from "./frame";
import { SectionHeading } from "./section-heading";

// Four things the app does today, each claim backed by a screen that exists. Signed out,
// every way in goes to register, which lands on the same screens.
function features(signedIn: boolean): Feature[] {
  const to = (path: string) => (signedIn ? path : "/register");
  return [
    {
      title: "Every subject gets its own pod",
      body: "Add your syllabus and each subject becomes a pod: its topics, your material and your progress in one place.",
      points: [
        "Topics straight from the syllabus, ticked off as you go",
        "Notes, PDFs, links and notebook photos mapped to their topics",
        "An exam board: to study, studying, revising, done",
      ],
      link: { label: "Open pods", href: to("/pods") },
      scene: <PodsScene />,
    },
    {
      title: "Sit real papers, exam hall rules",
      body: "Upload any question paper and mark your answers on an OMR sheet beside it, against the clock.",
      points: [
        "A 100-question answer sheet, A to D",
        "The clock starts before your first mark and never pauses",
        "Every mark saved as you go",
      ],
      link: { label: "Open tests", href: to("/tests") },
      scene: <PaperScene />,
    },
    {
      title: "Squads to study with",
      body: "A squad has channels, and one chat in each does it all. Only what you share leaves your pods.",
      points: [
        "Share from your pods, run polls and post mock tests",
        "Ask a doubt and mark the answer that helped",
        "A study room and a weekly squad rank",
      ],
      link: { label: "Find a squad", href: to("/groups") },
      scene: <SquadScene />,
    },
    {
      title: "A plan that shows its working",
      body: "Built from your pods, the days left and the hours you have. Every task says why it's there.",
      points: [
        "Change the minutes, the day or the order, and it keeps your edit",
        "Missed days never pile up: each week starts fresh",
      ],
      link: { label: "Build your plan", href: to("/plan") },
      scene: <PlanScene />,
    },
  ];
}

/**
 * A ruled grid, two rows of two, the column split offset between rows. The rules run the
 * full width; each picture runs off its own cell. One column under 768px.
 */
export function FeaturesGrid({ signedIn }: { signedIn: boolean }) {
  const [pods, papers, squads, plan] = features(signedIn);
  const second = "border-t border-border md:border-t-0 md:border-l";
  return (
    <section id="features" aria-labelledby="features-title">
      <Band as="div" inner="px-4 py-16 md:px-8 md:py-24">
        <Reveal>
          <SectionHeading
            id="features-title"
            eyebrow="Features"
            title="Built around your syllabus"
          >
            Your subjects as pods, real papers to practise on, a squad to study
            with, and a plan that fits your days.
          </SectionHeading>
        </Reveal>
      </Band>
      <Band as="div" inner="grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <FeatureCell feature={pods!} />
        <FeatureCell feature={papers!} className={second} />
      </Band>
      <Band as="div" inner="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <FeatureCell feature={squads!} />
        <FeatureCell feature={plan!} className={second} />
      </Band>
    </section>
  );
}
