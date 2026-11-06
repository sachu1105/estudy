/** Which bubble is filled on each row of the little sheet: A, C, B, D, B. */
const FILLED = [0, 2, 1, 3, 1];

/**
 * The Store banner's picture: a question paper with an OMR sheet over it, drawn in
 * white on the banner's art. Decorative.
 */
export function StoreHeroArt() {
  return (
    <div className="relative h-36 w-52">
      <div className="absolute top-2 left-0 h-32 w-28 -rotate-6 rounded-chip bg-white/15 p-3 ring-1 ring-white/25 backdrop-blur-sm">
        {[100, 80, 92, 64, 86, 72].map((w, i) => (
          <span
            key={i}
            className="mb-2 block h-1.5 rounded-full bg-white/50"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
      <div className="absolute top-0 right-0 flex rotate-3 flex-col gap-2 rounded-chip bg-surface/95 p-3 shadow-lg">
        {FILLED.map((on, row) => (
          <span key={row} className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((col) => (
              <span
                key={col}
                className={
                  col === on
                    ? "size-3.5 rounded-full bg-tint-violet"
                    : "size-3.5 rounded-full border border-tint-violet/50"
                }
              />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
