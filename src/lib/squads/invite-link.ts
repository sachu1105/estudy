/** /groups/join/<code>, the path an invite link carries. */
const INVITE_PATH = /^\/groups\/join\/([A-Za-z0-9]{6,12})\/?$/;

/** The invite code in a link to a squad's join page, else null. */
export function inviteCodeOf(href: string) {
  try {
    return INVITE_PATH.exec(new URL(href).pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}
