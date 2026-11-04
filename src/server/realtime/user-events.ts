import "server-only";

import { publisher } from "./index";
import { userChannel, type UserEvents } from "./types";

// A person's own stream: pub/sub only. A stream that (re)opens tells the client to
// re-read, so nothing missed while away needs replaying.

export const userEvents: UserEvents = {
  async emit(userIds, event) {
    try {
      await Promise.all(
        [...new Set(userIds)].map((id) =>
          publisher.publish(userChannel(id), event),
        ),
      );
    } catch {
      // Realtime is a nicety: the change is saved, and the next load shows it.
    }
  },
};
