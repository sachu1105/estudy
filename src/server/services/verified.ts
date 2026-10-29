import "server-only";

import { can } from "@/server/entitlements";
import { userRepository } from "@/server/repositories/user-repository";

/**
 * Which of these people carry the verified mark: a real paid plan (PRO or ELITE, paid
 * or granted by an admin). It is paid-only, so the free launch doesn't hand it to all.
 */
export async function verifiedIds(ids: Iterable<string>) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Set<string>();
  const subs = await userRepository.subscriptionsOf(unique);
  return new Set(
    unique.filter((id) =>
      can({ subscription: subs.get(id) ?? null }, "verifiedBadge"),
    ),
  );
}
