import { Fragment } from "react";

import {
  parseMarkdown,
  type Inline,
  type Mention,
} from "@/lib/markdown/markdown";

// Renders the markdown subset element by element: no HTML string, no
// dangerouslySetInnerHTML, so nothing a member types can run in another's browser.

function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "br":
        return <br key={i} />;
      case "strong":
        return (
          <strong key={i} className="font-semibold">
            <Inlines nodes={node.children} />
          </strong>
        );
      case "em":
        return (
          <em key={i}>
            <Inlines nodes={node.children} />
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            className="rounded-[6px] bg-surface-muted px-1 font-mono text-small"
          >
            {node.text}
          </code>
        );
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="[overflow-wrap:anywhere] text-accent-ink underline underline-offset-2"
          >
            {node.text}
          </a>
        );
      case "mention":
        return (
          <span key={i} className="font-medium text-accent-ink">
            @{node.name}
          </span>
        );
    }
  });
}

export function PostBody({
  source,
  mentions = [],
}: {
  source: string;
  mentions?: Mention[];
}) {
  const blocks = parseMarkdown(source, mentions);
  return (
    <div className="flex flex-col gap-3 text-body wrap-break-word">
      {blocks.map((block, i) => {
        if (block.type === "p")
          return (
            <p key={i}>
              <Inlines nodes={block.children} />
            </p>
          );
        if (block.type === "quote")
          return (
            <blockquote
              key={i}
              className="border-l-2 border-border pl-3 text-ink-muted"
            >
              <Inlines nodes={block.children} />
            </blockquote>
          );
        if (block.type === "pre")
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-chip bg-surface-muted p-3 font-mono text-small"
            >
              {block.text}
            </pre>
          );
        const List = block.type;
        return (
          <List
            key={i}
            className={`flex flex-col gap-1 pl-5 ${List === "ul" ? "list-disc" : "list-decimal"}`}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines nodes={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
