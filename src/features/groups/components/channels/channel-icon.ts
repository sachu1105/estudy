import {
  ClipboardCheck,
  FileText,
  Hash,
  Link2,
  Megaphone,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

import type { ChannelType } from "@/lib/squads/templates";

/** One icon per channel type, the same everywhere a channel is named. */
export const CHANNEL_ICONS: Record<ChannelType, LucideIcon> = {
  CHAT: Hash,
  THREADS: MessagesSquare,
  MATERIAL: FileText,
  LINKS: Link2,
  TESTS: ClipboardCheck,
  ANNOUNCEMENTS: Megaphone,
};

export const channelHref = (groupId: string, channelId: string) =>
  `/groups/${groupId}/c/${channelId}`;

/** What the sidebar and pages need of a channel. */
export type ChannelSummary = {
  id: string;
  categoryId: string | null;
  type: ChannelType;
  name: string;
  topic: string | null;
  postRule: "EVERYONE" | "ADMINS";
  viewRule: "EVERYONE" | "ADMINS" | "PICKED";
  slowModeSec: number;
  subjectName: string | null;
};

export type CategorySummary = {
  id: string;
  name: string;
  channels: ChannelSummary[];
};
