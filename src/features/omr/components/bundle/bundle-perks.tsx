import { FileCheck2, KeyRound, ShieldCheck, Timer } from "lucide-react";

/** What having a bundle gives: the papers, the timed sheet, the key, a personal copy. */
export function BundlePerks({
  papers,
  questions,
  owner,
}: {
  papers: number;
  questions: number;
  /** Its maker sits their own files, not a marked copy. */
  owner: boolean;
}) {
  const perks = [
    {
      icon: FileCheck2,
      text: `${papers} paper${papers === 1 ? "" : "s"}, ${questions} questions`,
    },
    { icon: Timer, text: "Timed, on an OMR sheet beside the paper" },
    { icon: KeyRound, text: "The key and your exact score after each sitting" },
    ...(owner
      ? []
      : [
          {
            icon: ShieldCheck,
            text: "Your own copy, marked with your name: for you alone, not for sharing",
          },
        ]),
  ];
  return (
    <ul className="flex flex-col gap-2.5 border-t border-border pt-4">
      {perks.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-2.5 text-small">
          <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
