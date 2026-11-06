import { LogOut, PenLine, Save, Timer, type LucideIcon } from "lucide-react";

type Rule = { icon: LucideIcon; name: string; line: string };

/** The hall's rules, short; how a mark behaves follows the sheet setting. */
function rules(final: boolean, exam: boolean): Rule[] {
  return [
    { icon: Timer, name: "No pause", line: "The clock runs until time's up." },
    final
      ? { icon: PenLine, name: "Marks are final", line: "Like pen on paper." }
      : {
          icon: PenLine,
          name: "Marks can change",
          line: "Tap again to clear one.",
        },
    {
      icon: Save,
      name: "Saves as you go",
      line: "Every mark, at once.",
    },
    exam
      ? {
          icon: LogOut,
          name: "One sitting",
          line: "Leaving doesn't stop the clock.",
        }
      : {
          icon: LogOut,
          name: "Leaving ends it",
          line: "The next sitting starts clean.",
        },
  ];
}

/** The rules of the sitting as four small tiles, two by two. */
export function ExamRules({
  final,
  exam = false,
}: {
  final: boolean;
  /** A squad exam: one sitting, on a clock that keeps running. */
  exam?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {rules(final, exam).map(({ icon: Icon, name, line }) => (
        <li
          key={name}
          className="flex items-start gap-2.5 rounded-control border border-border p-3"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="flex min-w-0 flex-col">
            <span className="text-small font-medium">{name}</span>
            <span className="text-small text-ink-muted">{line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
