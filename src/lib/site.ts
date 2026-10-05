// Public facts about the product, shared by the marketing pages, metadata and footer.

export const site = {
  name: "Study planner",
  company: "Veraft",
  tagline: "Your syllabus, turned into a daily plan you can actually finish.",
  description:
    "Upload your syllabus, set how strong you are in each subject, and get a day-by-day study plan with a mock test after every task. For Kerala PSC, SSC and RRB aspirants.",
  // TODO(owner): replace with the real inbox before launch.
  contactEmail: "hello@example.com",
  // TODO(owner): add real handles; the footer renders only what is listed here.
  social: [] as { label: string; href: string }[],
};

export const exams = [
  "Kerala PSC LDC",
  "Kerala PSC LGS",
  "Degree level prelims",
  "High Court Assistant",
  "SSC CGL",
  "SSC CHSL",
  "RRB NTPC",
];

export const landingSections = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "groups", label: "Groups" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];
