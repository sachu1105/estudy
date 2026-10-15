import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { userRepository } from "@/server/repositories/user-repository";
import { storage } from "@/server/storage";

import { createProfileService } from "./profile-service";

export const profileService = createProfileService({
  users: userRepository,
  storage,
  ids: randomIds,
  clock: systemClock,
});

export {
  AVATAR_MAX_BYTES,
  PROFILE_COVER_MAX_BYTES,
  type ProfileImageKind,
} from "./profile-service";
