// What each role in a squad may do. One place, so the server checks and the UI agree.

export const GROUP_ROLES = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/** Higher outranks lower. Nobody acts on someone at or above their own rank. */
export const RANK: Record<GroupRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  MEMBER: 1,
};

export const ROLE_LABELS: Record<GroupRole, string> = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member",
};

/** Channels, categories, invites and the squad's settings. */
export const canManage = (role: GroupRole) => RANK[role] >= RANK.ADMIN;

/** Hide or delete what others wrote, and mute people. */
export const canModerate = (role: GroupRole) => RANK[role] >= RANK.MODERATOR;

/** Post where only the squad's staff may post, and skip slow mode. */
export const postsAnywhere = canModerate;

/** Outranks the other person, so may act on them. */
export const outranks = (mine: GroupRole, theirs: GroupRole) =>
  RANK[mine] > RANK[theirs];
