// Public facts about the product, shared by the marketing pages, metadata and footer.

export const site = {
  name: "studypods",
  company: "Veraft",
  tagline: "Your syllabus, one pod at a time.",
  description:
    "A study space for competitive exam aspirants. Every subject of your syllabus becomes a pod for its topics, notes, PDFs and links. Sit previous papers on an OMR sheet with negative marking, and prepare together in squads.",
  // TODO(owner): replace with the real inbox before launch.
  contactEmail: "hello@example.com",
  // TODO(owner): add real handles; the footer renders only what is listed here.
  social: [] as { label: string; href: string }[],
};

// Kinds of competitive exam, for the landing marquee, state exams first. Any syllabus
// works; no state, commission or post is named.
export const examKinds = [
  "Public service exams",
  "State government exams",
  "Clerical and assistant posts",
  "Police and forest service",
  "Teaching eligibility",
];

export const landingSections = [
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];
