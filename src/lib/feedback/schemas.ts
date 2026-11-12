import { z } from "zod";

// Feedback: one 1-5 star rating of the app per person, with an optional note. Shared by
// the modal, the server action and the service, so both ends check the same rules.

/** One word per star, low to high. */
export const STAR_WORDS = ["Poor", "Okay", "Good", "Great", "Love it"];

export const NOTE_MAX = 500;

export const ratingSchema = z.object({
  stars: z.number().int().min(1, "Pick a star.").max(5),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`)
    .default(""),
});

export type RatingInput = z.infer<typeof ratingSchema>;
