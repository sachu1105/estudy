// How people get into a squad, as one choice: whether it is listed, and how they join.

export type JoinMode = "OPEN" | "REQUEST" | "INVITE_ONLY";

/** A private squad is never open: it asks, or it needs an invite. */
export const joinModeOf = (group: {
  visibility: "PUBLIC" | "PRIVATE";
  joinMode: JoinMode;
}): JoinMode =>
  group.visibility === "PRIVATE" && group.joinMode === "OPEN"
    ? "REQUEST"
    : group.joinMode;

export type SquadAccess = "OPEN" | "ASK" | "PRIVATE" | "INVITE";

export const SQUAD_ACCESS: Record<
  SquadAccess,
  {
    label: string;
    description: string;
    visibility: "PUBLIC" | "PRIVATE";
    joinMode: JoinMode;
  }
> = {
  OPEN: {
    label: "Open",
    description: "Listed under Discover. Anyone joins with one tap.",
    visibility: "PUBLIC",
    joinMode: "OPEN",
  },
  ASK: {
    label: "Ask to join",
    description: "Listed under Discover. Admins approve each request.",
    visibility: "PUBLIC",
    joinMode: "REQUEST",
  },
  PRIVATE: {
    label: "Private",
    description: "Not listed. People ask through a link, or use an invite.",
    visibility: "PRIVATE",
    joinMode: "REQUEST",
  },
  INVITE: {
    label: "Invite only",
    description: "Not listed. Only invite links and codes get people in.",
    visibility: "PRIVATE",
    joinMode: "INVITE_ONLY",
  },
};

/** The one choice a squad's settings show, from what is stored. */
export function accessOf(group: {
  visibility: "PUBLIC" | "PRIVATE";
  joinMode: JoinMode;
}): SquadAccess {
  const mode = joinModeOf(group);
  if (mode === "INVITE_ONLY") return "INVITE";
  if (group.visibility === "PRIVATE") return "PRIVATE";
  return mode === "OPEN" ? "OPEN" : "ASK";
}

/** Whether people joining this way answer the squad's question. */
export const asksToJoin = (access: SquadAccess) =>
  SQUAD_ACCESS[access].joinMode === "REQUEST";
