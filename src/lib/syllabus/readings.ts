// Which cached syllabus readings count as "already read" (rule 4). Pure, shared by the
// syllabus services and the repository that looks the readings up.

/**
 * In a list of reading versions: any AI reading at all, whichever model or prompt made it.
 * Listed after the exact versions, so a reading by the current prompt still comes first.
 */
export const ANY_AI_READING = "ai:any";

/** Readings by the headings-and-lists rules are versioned `rules@N`. */
export const RULES_PREFIX = "rules@";
export const isRulesReading = (promptVersion: string) =>
  promptVersion.startsWith(RULES_PREFIX);
