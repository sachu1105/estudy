// The channels a new squad starts with. Pure data: the squad service creates them, and
// the squad_channels migration gave every older squad the exam squad set.

export const CHANNEL_TYPES = [
  "CHAT",
  "THREADS",
  "MATERIAL",
  "LINKS",
  "TESTS",
  "ANNOUNCEMENTS",
] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export type ChannelPostRule = "EVERYONE" | "ADMINS";

export const TEMPLATE_KEYS = ["EXAM", "CIRCLE", "BLANK"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateChannel = {
  type: ChannelType;
  name: string;
  topic: string;
  postRule: ChannelPostRule;
};

export type SquadTemplate = {
  label: string;
  description: string;
  /** Categories in order, each with its channels in order. */
  categories: { name: string; channels: TemplateChannel[] }[];
};

const channel = (
  type: ChannelType,
  name: string,
  topic: string,
  postRule: ChannelPostRule = "EVERYONE",
): TemplateChannel => ({ type, name, topic, postRule });

export const SQUAD_TEMPLATES: Record<TemplateKey, SquadTemplate> = {
  // Every channel is a chat that does everything (messages, doubts, photos and PDFs,
  // pod material, mock tests, polls); announcements is one only admins write in.
  EXAM: {
    label: "Exam squad",
    description: "Announcements, a general chat and a place for doubts.",
    categories: [
      {
        name: "Info",
        channels: [
          channel(
            "ANNOUNCEMENTS",
            "announcements",
            "News from the squad's admins",
            "ADMINS",
          ),
        ],
      },
      {
        name: "General",
        channels: [
          channel("CHAT", "general", "Talk about anything to do with the exam"),
          channel("CHAT", "doubts", "Ask a doubt, answer one"),
        ],
      },
    ],
  },
  CIRCLE: {
    label: "Study circle",
    description: "For a few friends: one chat for everything.",
    categories: [
      {
        name: "Study",
        channels: [
          channel("CHAT", "general", "Plan the week, keep each other going"),
        ],
      },
    ],
  },
  BLANK: {
    label: "Blank",
    description: "One chat channel. Add the rest yourself.",
    categories: [
      {
        name: "General",
        channels: [channel("CHAT", "general", "Say hello")],
      },
    ],
  },
};

/** What each channel type is called in the app. */
export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  CHAT: "Chat",
  THREADS: "Threads",
  MATERIAL: "Material",
  LINKS: "Links",
  TESTS: "Mock tests",
  ANNOUNCEMENTS: "Announcements",
};
