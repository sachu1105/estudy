// Public facts about the product, shared by the marketing pages, metadata and footer.

export const site = {
  name: "studypods",
  company: "Veraft",
  tagline: "Your syllabus, one pod at a time.",
  description:
    "Track your syllabus subject by subject: every subject becomes a pod for its topics, notes, PDFs and links, with your progress at a glance and AI mock tests from your own notes. For competitive exam aspirants.",
  // TODO(owner): replace with the real inbox before launch.
  contactEmail: "hello@example.com",
  // TODO(owner): add real handles; the footer renders only what is listed here.
  social: [] as { label: string; href: string }[],
};

// Kinds of competitive exam, for the landing marquee. Any syllabus works; none is named.
export const examKinds = [
  "Public service exams",
  "Staff selection",
  "Banking",
  "Railways",
  "Teaching eligibility",
  "Defence",
  "Entrance exams",
];

export const landingSections = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "groups", label: "Squads" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];
