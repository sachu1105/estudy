// Quotes for the landing page's testimonials.
//
// TODO(owner): these are SAMPLES written to show the layout. They are not from real
// people and must not go live. Replace them with real quotes, used with each person's
// permission, then set `sample` to false. While `sample` is true the section renders in
// development only (with a "sample" note) and is hidden in production.

export type Testimonial = {
  name: string;
  /** Who they are, in their words: "Banking aspirant". */
  role: string;
  quote: string;
};

export const testimonials: { sample: boolean; quotes: Testimonial[] } = {
  sample: true,
  quotes: [
    {
      name: "Sample aspirant",
      role: "Public service aspirant",
      quote:
        "I finally know what to study each morning. The plan fits the two hours I get after work.",
    },
    {
      name: "Sample aspirant",
      role: "Banking aspirant",
      quote:
        "The short test after every topic shows me what didn't stick, and the plan brings it back.",
    },
    {
      name: "Sample aspirant",
      role: "Staff selection aspirant",
      quote:
        "Our squad shares notes and mock tests. Seeing the weekly rank keeps all five of us going.",
    },
    {
      name: "Sample aspirant",
      role: "Railways aspirant",
      quote:
        "I uploaded the syllabus PDF and every subject was there to check in a few minutes.",
    },
    {
      name: "Sample aspirant",
      role: "Teaching exam aspirant",
      quote:
        "Missing a day doesn't pile up. Next week's plan just starts fresh from where I am.",
    },
    {
      name: "Sample aspirant",
      role: "Degree level aspirant",
      quote:
        "My photos of notebook pages sit right under the topic they cover. No more hunting.",
    },
  ],
};

/** Whether the section shows: real quotes always; samples only while developing. */
export const showTestimonials = (production: boolean) =>
  testimonials.quotes.length > 0 && (!testimonials.sample || !production);
