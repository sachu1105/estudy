import { FileText, Image as ImageIcon, Link2, NotebookPen } from "lucide-react";

const ICONS = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
} as const;

/** The icon for a kind of pod item: note, link, file or image. */
export function PodItemIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type as keyof typeof ICONS] ?? FileText;
  return <Icon className={className} aria-hidden />;
}
