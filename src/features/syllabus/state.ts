// One word for where a syllabus is in its life, used by badges and pages alike.

export type SyllabusState =
  "reading" | "failed" | "review" | "confirmed" | "pending" | "rejected";

export function syllabusState(version: {
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  parseId: string | null;
  parseJobs: { status: "QUEUED" | "RUNNING" | "READY" | "FAILED" }[];
}): SyllabusState {
  if (version.status === "APPROVED") return "confirmed";
  if (version.status === "PENDING") return "pending";
  if (version.status === "REJECTED") return "rejected";
  if (version.parseId) return "review";
  return version.parseJobs[0]?.status === "FAILED" ? "failed" : "reading";
}

export const stateLabels: Record<
  SyllabusState,
  {
    label: string;
    tone: "neutral" | "accent" | "success" | "danger" | "outline";
  }
> = {
  reading: { label: "Reading", tone: "neutral" },
  failed: { label: "Couldn't read", tone: "danger" },
  review: { label: "Ready to review", tone: "accent" },
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Waiting for approval", tone: "outline" },
  rejected: { label: "Not approved", tone: "outline" },
};
