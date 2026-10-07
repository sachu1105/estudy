import { PodCover } from "@/components/blocks/pod-cover";
import type { CoverPreset } from "@/lib/pods/covers";

// A sample exam pod, as a new user's would look a week in. Illustrative, not data.
const pods: {
  name: string;
  done: number;
  total: number;
  preset: CoverPreset;
}[] = [
  { name: "Indian Constitution", done: 12, total: 30, preset: "blurple" },
  { name: "Indian geography", done: 9, total: 18, preset: "meadow" },
  { name: "Quantitative aptitude", done: 4, total: 26, preset: "ember" },
  { name: "General English", done: 15, total: 22, preset: "ocean" },
];

/** The left half of the hero window: the pods one syllabus turns into. */
export function HeroPods() {
  return (
    <div
      role="img"
      aria-label="An exam pod for Prelims 2026 holding four subject pods, each with its topics done"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="font-heading text-body font-medium text-ink">
          Prelims 2026
        </p>
        <p className="text-small text-ink-muted">4 subject pods</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {pods.map((pod) => (
          <li
            key={pod.name}
            className="relative isolate flex min-h-28 flex-col justify-end overflow-hidden rounded-card border border-border bg-surface sm:min-h-32"
          >
            <PodCover
              cover={{ kind: "gradient", preset: pod.preset }}
              className="absolute inset-x-0 top-0 -z-10 h-12 sm:h-14"
            />
            <div className="flex flex-col gap-1.5 rounded-t-[12px] bg-surface p-3">
              <p className="truncate text-small font-medium text-ink">
                {pod.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${(pod.done / pod.total) * 100}%` }}
                  />
                </span>
                <span className="font-mono text-micro text-ink-muted tabular-nums">
                  {pod.done}/{pod.total}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
