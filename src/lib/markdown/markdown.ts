// A small markdown subset for group posts (milestone 14). It parses to a tree that React
// renders element by element, so no HTML string is ever produced: raw HTML in a post is
// shown as the text it is.
//
// Blocks: paragraphs, "- " and "1. " lists, "> " quotes, ``` code fences.
// Inline: **bold**, *italic* or _italic_, `code`, [text](https://...), bare https links,
// and @mentions of known people.

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; text: string }
  | { type: "mention"; id: string; name: string }
  | { type: "br" };

export type Block =
  | { type: "p"; children: Inline[] }
  | { type: "quote"; children: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] }
  | { type: "pre"; text: string };

export type Mention = { id: string; name: string };

const MAX_LENGTH = 10_000;

/** Only http and https links; anything else stays text. */
export function safeHref(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function inlineRule(mentions: Mention[]) {
  const names = [...mentions]
    .sort((a, b) => b.name.length - a.name.length)
    .map((m) => escape(m.name));
  const parts = [
    "`([^`\\n]+)`", // 1 code
    "\\*\\*(.+?)\\*\\*", // 2 strong
    "\\*([^*\\s](?:[^*]*?[^*\\s])?)\\*", // 3 em
    "(?<![\\w])_([^_\\s](?:[^_]*?[^_\\s])?)_(?![\\w])", // 4 em
    "\\[([^\\]\\n]+)\\]\\((\\S+?)\\)", // 5, 6 link
    "(https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?'\"])", // 7 bare link
  ];
  if (names.length) parts.push(`@(${names.join("|")})(?![\\w])`); // 8 mention
  return new RegExp(parts.join("|"), "g");
}

export function parseInline(text: string, mentions: Mention[] = []): Inline[] {
  const out: Inline[] = [];
  const push = (node: Inline) => {
    const last = out.at(-1);
    if (node.type === "text" && last?.type === "text") last.text += node.text;
    else out.push(node);
  };
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) out.push({ type: "br" });
    const rule = inlineRule(mentions);
    let at = 0;
    for (const m of line.matchAll(rule)) {
      if (m.index > at) push({ type: "text", text: line.slice(at, m.index) });
      at = m.index + m[0].length;
      if (m[1] !== undefined) push({ type: "code", text: m[1] });
      else if (m[2] !== undefined)
        push({ type: "strong", children: parseInline(m[2], mentions) });
      else if (m[3] !== undefined || m[4] !== undefined)
        push({ type: "em", children: parseInline(m[3] ?? m[4], mentions) });
      else if (m[5] !== undefined) {
        const href = safeHref(m[6]);
        push(
          href
            ? { type: "link", href, text: m[5] }
            : { type: "text", text: m[0] },
        );
      } else if (m[7] !== undefined) {
        const href = safeHref(m[7]);
        push(
          href
            ? { type: "link", href, text: m[7] }
            : { type: "text", text: m[0] },
        );
      } else if (m[8] !== undefined) {
        const who = mentions.find((p) => p.name === m[8])!;
        push({ type: "mention", id: who.id, name: who.name });
      }
    }
    if (at < line.length) push({ type: "text", text: line.slice(at) });
  });
  return out;
}

const LIST = { ul: /^\s*[-*]\s+(.*)$/, ol: /^\s*\d+[.)]\s+(.*)$/ };

export function parseMarkdown(source: string, mentions: Mention[] = []) {
  const lines = source.slice(0, MAX_LENGTH).replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const take = (test: (line: string) => boolean) => {
    const taken: string[] = [];
    while (i < lines.length && test(lines[i])) taken.push(lines[i++]);
    return taken;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.trim().startsWith("```")) {
      i++;
      const code = take((l) => !l.trim().startsWith("```"));
      i++; // the closing fence, if there is one
      blocks.push({ type: "pre", text: code.join("\n") });
    } else if (line.startsWith(">")) {
      const quote = take((l) => l.startsWith(">")).map((l) =>
        l.replace(/^>\s?/, ""),
      );
      blocks.push({
        type: "quote",
        children: parseInline(quote.join("\n"), mentions),
      });
    } else if (LIST.ul.test(line) || LIST.ol.test(line)) {
      const type = LIST.ul.test(line) ? "ul" : "ol";
      const items = take((l) => LIST[type].test(l)).map((l) =>
        parseInline(l.match(LIST[type])![1], mentions),
      );
      blocks.push({ type, items });
    } else {
      const para = take(
        (l) =>
          !!l.trim() &&
          !l.startsWith(">") &&
          !l.trim().startsWith("```") &&
          !LIST.ul.test(l) &&
          !LIST.ol.test(l),
      );
      blocks.push({
        type: "p",
        children: parseInline(para.join("\n"), mentions),
      });
    }
  }
  return blocks;
}

/** Plain text of a post, for previews and notification lines. */
export function plainText(source: string, length = 160) {
  const flat = source
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
}

/** The people whose "@Name" is still in the text, out of those picked while writing. */
export function mentionedIn(text: string, picked: Mention[]) {
  return picked.filter((m) =>
    new RegExp(`@${escape(m.name)}(?![\\w])`).test(text),
  );
}
