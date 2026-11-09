const STOP = new Set(
  "a an and the to of for in on with my me i we it is be add more can could please option way when".split(
    " ",
  ),
);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

/**
 * Ideas whose titles share words with what's being typed, best match first, so people
 * back an idea that's already there instead of posting it twice.
 */
export function similarIdeas<T extends { title: string; body: string }>(
  draft: string,
  ideas: T[],
  take = 3,
): T[] {
  const wanted = new Set(words(draft));
  if (wanted.size === 0) return [];
  return ideas
    .map((idea) => {
      const have = new Set(words(`${idea.title} ${idea.body}`));
      let hits = 0;
      for (const w of wanted) if (have.has(w)) hits += 1;
      return { idea, hits };
    })
    .filter((s) => s.hits > 0 && s.hits / wanted.size >= 0.5)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, take)
    .map((s) => s.idea);
}
