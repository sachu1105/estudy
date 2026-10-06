import "server-only";

import { userRepository } from "@/server/repositories/user-repository";

/** The signed-in user's own settings (layering: pages and actions come through here). */
export const profileService = {
  privacy: (user: { id: string }) => userRepository.privacyOf(user.id),
  savePrivacy: (
    user: { id: string },
    data: { hideFromGlobalRank: boolean; district: string | null },
  ) => userRepository.updatePrivacy(user.id, data),
};
