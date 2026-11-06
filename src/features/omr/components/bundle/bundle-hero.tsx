import { PodCover } from "@/components/blocks/pod-cover";
import { coverFor } from "@/lib/pods/covers";

/**
 * The top of a bundle's page: its cover art (the same as its card), dimmed so the white
 * type reads, with what it is, its name and where it's from.
 */
export function BundleHero({
  id,
  title,
  kicker,
  from,
}: {
  id: string;
  title: string;
  /** "Bundle · 4 papers" or "Paper". */
  kicker: string;
  from: string;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-card">
      <PodCover cover={coverFor(id)} className="absolute inset-0 -z-10" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-black/35" />
      <div className="flex min-h-40 flex-col justify-end gap-2 px-5 pt-12 pb-5 md:min-h-52 md:px-8 md:pb-7">
        <span className="self-start rounded-full bg-black/35 px-2.5 py-1 text-micro text-white uppercase backdrop-blur-sm">
          {kicker}
        </span>
        <h1 className="font-heading text-h1 font-semibold text-white md:text-display">
          {title}
        </h1>
        <p className="text-body text-white/85">{from}</p>
      </div>
    </section>
  );
}
