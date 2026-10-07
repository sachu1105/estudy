import { Circle, Star, type LucideIcon } from "lucide-react";

/** A topic's two 1-5 scales, as the editor shows and reads them out. */
export const LEVELS: Record<
  "weight" | "difficulty",
  { label: string; words: string[]; icon: LucideIcon }
> = {
  // Stars for how much of the exam a topic is; dots for how hard it is.
  weight: {
    label: "Weight",
    words: ["minor", "small", "medium", "big", "major"],
    icon: Star,
  },
  difficulty: {
    label: "Difficulty",
    words: ["easy", "fair", "medium", "hard", "very hard"],
    icon: Circle,
  },
};
