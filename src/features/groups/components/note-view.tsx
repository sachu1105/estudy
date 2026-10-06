import type { ReactNode } from "react";

import type { DocNode } from "@/lib/notes/doc";

const SAFE_LINK = /^(https?:|mailto:)/i;
const SAFE_IMAGE = /^\/api\/groups\/files\/[0-9a-f-]{36}$/;

function marked(text: string, marks: DocNode["marks"], key: number): ReactNode {
  let out: ReactNode = text;
  for (const m of marks ?? []) {
    if (m.type === "bold") out = <strong key={key}>{out}</strong>;
    else if (m.type === "italic") out = <em key={key}>{out}</em>;
    else if (m.type === "highlight") out = <mark key={key}>{out}</mark>;
    else if (m.type === "code") out = <code key={key}>{out}</code>;
    else if (m.type === "link" && SAFE_LINK.test(String(m.attrs?.href ?? "")))
      out = (
        <a
          key={key}
          href={String(m.attrs!.href)}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {out}
        </a>
      );
  }
  return out;
}

function render(node: DocNode, key: number): ReactNode {
  const kids = (node.content ?? []).map(render);
  switch (node.type) {
    case "text":
      return marked(node.text ?? "", node.marks, key);
    case "paragraph":
      return <p key={key}>{kids}</p>;
    case "heading":
      return Number(node.attrs?.level) <= 2 ? (
        <h2 key={key}>{kids}</h2>
      ) : (
        <h3 key={key}>{kids}</h3>
      );
    case "bulletList":
      return <ul key={key}>{kids}</ul>;
    case "orderedList":
    case "taskList":
      return <ol key={key}>{kids}</ol>;
    case "listItem":
    case "taskItem":
      return <li key={key}>{kids}</li>;
    case "blockquote":
      return <blockquote key={key}>{kids}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{kids}</code>
        </pre>
      );
    case "hardBreak":
      return <br key={key} />;
    case "table":
      return (
        <table key={key}>
          <tbody>{kids}</tbody>
        </table>
      );
    case "tableRow":
      return <tr key={key}>{kids}</tr>;
    case "tableHeader":
      return <th key={key}>{kids}</th>;
    case "tableCell":
      return <td key={key}>{kids}</td>;
    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!SAFE_IMAGE.test(src)) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- a members-only, signed file
        <img
          key={key}
          src={src}
          alt={String(node.attrs?.alt ?? "")}
          loading="lazy"
        />
      );
    }
    default:
      return kids.length ? <div key={key}>{kids}</div> : null;
  }
}

/**
 * A shared note, read-only. Built as React elements from the document, never as HTML,
 * so nothing a sharer typed can run in someone else's browser.
 */
export function NoteView({ doc }: { doc: DocNode }) {
  return <div className="note-content">{(doc.content ?? []).map(render)}</div>;
}
