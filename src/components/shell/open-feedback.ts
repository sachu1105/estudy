// The feedback modal lives in the shell layout. Anything (the sidebar, the command
// palette, Settings) opens it with openFeedback(), so the shell stays free of feature
// imports.

export const FEEDBACK_EVENT = "studypods:feedback";

export function openFeedback() {
  window.dispatchEvent(new Event(FEEDBACK_EVENT));
}
