import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const WORDS = {
  weight: ["minor", "small", "medium", "big", "major"],
  difficulty: ["easy", "fair", "medium", "hard", "very hard"],
};

type LevelSelectProps = {
  kind: "weight" | "difficulty";
  value: number;
  onChange: (value: number) => void;
  topicName: string;
};

/** Native select: the phone's own picker, and light enough for hundreds of rows. */
export function LevelSelect({
  kind,
  value,
  onChange,
  topicName,
}: LevelSelectProps) {
  const label = kind === "weight" ? "Weight" : "Difficulty";
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-small text-ink-muted">{label}</span>
      <select
        aria-label={`${label} of ${topicName || "topic"}`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(fieldClasses, "h-11 appearance-auto py-0 md:h-9")}
      >
        {WORDS[kind].map((word, i) => (
          <option key={word} value={i + 1}>
            {i + 1} · {word}
          </option>
        ))}
      </select>
    </label>
  );
}
