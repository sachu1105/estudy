import { cn } from "@/lib/utils/cn";

/** Which bubble is marked on each row of the sheet: A, C, B, D, B. */
const MARKED = [0, 2, 1, 3, 1];

/** Frosted glass on the banner's art, lit from above. */
const GLASS =
  "rounded-card ring-1 ring-white/20 backdrop-blur-xl shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_30px_60px_-24px_rgb(0_0_0/0.6)]";

/**
 * The Store banner's picture: a bundle of papers fanned out in frosted glass, the top
 * one an OMR sheet marked in white. Decorative.
 */
export function StoreHeroArt() {
  return (
    <div className="relative h-60 w-80">
      {/* The rest of the bundle, fanned behind. */}
      <span
        className={cn(
          "absolute top-6 left-6 h-52 w-56 -rotate-[10deg] bg-white/5",
          GLASS,
        )}
      />
      <span
        className={cn(
          "absolute top-3 left-10 h-52 w-56 -rotate-[4deg] bg-white/[0.07]",
          GLASS,
        )}
      />
      <Sheet />
    </div>
  );
}

function Sheet() {
  return (
    <div
      className={cn(
        "absolute top-0 left-16 flex w-56 rotate-2 flex-col gap-4 bg-white/[0.12] p-5",
        GLASS,
      )}
    >
      <span className="flex items-center justify-between border-b border-white/15 pb-3">
        <span className="text-micro font-medium text-white/80 uppercase">
          Answer sheet
        </span>
        <span className="font-mono text-micro text-white/50 tabular-nums">
          No. 1001
        </span>
      </span>
      <span className="flex flex-col gap-2.5">
        {MARKED.map((on, row) => (
          <span key={row} className="flex items-center gap-4">
            <span className="w-3 text-right font-mono text-micro text-white/45 tabular-nums">
              {row + 1}
            </span>
            <span className="flex flex-1 justify-between">
              {[0, 1, 2, 3].map((col) => (
                <span
                  key={col}
                  className={
                    col === on
                      ? "size-[18px] rounded-full bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.12)]"
                      : "size-[18px] rounded-full border border-white/35"
                  }
                />
              ))}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
