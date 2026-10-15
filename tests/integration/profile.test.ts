import { beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { prisma } from "@/server/db";
import { userRepository } from "@/server/repositories/user-repository";
import { createProfileService } from "@/server/services/profile/profile-service";
import { createMemoryStorage } from "@/server/storage/memory";

import { resetDatabase } from "./helpers";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const store = createMemoryStorage();
const profiles = createProfileService({
  users: userRepository,
  storage: store.storage,
  ids: randomIds,
  clock: fixedClock("2026-10-08T04:30:00Z"),
});

let n = 0;
async function makeUser(displayName = "Anjali N") {
  const user = await prisma.user.create({
    data: {
      email: `user${(n += 1)}@example.com`,
      passwordHash: "x",
      name: displayName,
      displayName,
    },
  });
  return { id: user.id, displayName: user.displayName };
}

beforeEach(async () => {
  await resetDatabase();
  store.objects.clear();
});

describe("profile", () => {
  it("saves the name and bio, and an empty bio clears it", async () => {
    const user = await makeUser();
    expect(
      await profiles.save(user, { displayName: "  Anjali  ", bio: " Hi " }),
    ).toEqual({ ok: true });
    expect((await profiles.get(user))?.displayName).toBe("Anjali");
    expect((await profiles.get(user))?.bio).toBe("Hi");

    await profiles.save(user, { displayName: "Anjali", bio: "   " });
    expect((await profiles.get(user))?.bio).toBeNull();
  });

  it("refuses an empty name and an over-long bio", async () => {
    const user = await makeUser();
    expect(
      (await profiles.save(user, { displayName: " ", bio: null })).ok,
    ).toBe(false);
    expect(
      (
        await profiles.save(user, {
          displayName: "Anjali",
          bio: "x".repeat(161),
        })
      ).ok,
    ).toBe(false);
  });

  it("saves a photo, replaces it, and removing it deletes the bytes", async () => {
    const user = await makeUser();
    const first = `profile/avatar/${user.id}/${crypto.randomUUID()}`;
    await store.storage.put(first, PNG, "image/png");
    const saved = await profiles.setAvatar(user, first);
    // A stable path, not a storage key, and versioned so a new photo beats the cache.
    expect(saved.ok && saved.avatarUrl).toBe(
      `/api/profile-image/${user.id}?kind=avatar&v=${first.slice(-8)}`,
    );

    // A second photo replaces the first, and the first is dropped from storage.
    const second = `profile/avatar/${user.id}/${crypto.randomUUID()}`;
    await store.storage.put(second, PNG, "image/png");
    await profiles.setAvatar(user, second);
    expect(store.objects.has(first)).toBe(false);
    expect(store.objects.has(second)).toBe(true);

    await profiles.setAvatar(user, null);
    expect(store.objects.has(second)).toBe(false);
    expect((await profiles.get(user))?.hasAvatar).toBe(false);
  });

  it("refuses another user's key and bytes that aren't an image", async () => {
    const user = await makeUser();
    const other = await makeUser("Rahul M");

    const theirs = `profile/avatar/${other.id}/${crypto.randomUUID()}`;
    await store.storage.put(theirs, PNG, "image/png");
    expect((await profiles.setAvatar(user, theirs)).ok).toBe(false);

    const fake = `profile/avatar/${user.id}/${crypto.randomUUID()}`;
    await store.storage.put(
      fake,
      new TextEncoder().encode("<svg/>"),
      "image/png",
    );
    expect((await profiles.setAvatar(user, fake)).ok).toBe(false);
    expect(store.objects.has(fake)).toBe(false);
  });

  it("saves the cover as a gradient, then an image, then automatic again", async () => {
    const user = await makeUser();
    expect((await profiles.get(user))?.coverSelection).toBe("auto");

    await profiles.setCover(user, { kind: "gradient", preset: "ocean" });
    expect((await profiles.get(user))?.coverSelection).toBe("ocean");

    const key = `profile/cover/${user.id}/${crypto.randomUUID()}`;
    await store.storage.put(key, PNG, "image/png");
    const image = await profiles.setCover(user, { kind: "image", key });
    expect(image.ok && image.cover.kind).toBe("image");

    await profiles.setCover(user, { kind: "auto" });
    expect((await profiles.get(user))?.coverSelection).toBe("auto");
    expect(store.objects.has(key)).toBe(false);
  });

  it("will not share a profile without a handle, and keeps handles unique", async () => {
    const user = await makeUser();
    const other = await makeUser("Rahul M");

    expect((await profiles.setSharing(user, { profilePublic: true })).ok).toBe(
      false,
    );
    expect(
      (await profiles.setSharing(user, { profilePublic: true, handle: "no" }))
        .ok,
    ).toBe(false);

    const shared = await profiles.setSharing(user, {
      profilePublic: true,
      handle: "Anjali_N",
    });
    expect(shared).toMatchObject({ ok: true, handle: "anjali_n" });

    // Someone else cannot take the same address.
    const clash = await profiles.setSharing(other, {
      profilePublic: true,
      handle: "anjali_n",
    });
    expect(clash.ok).toBe(false);
  });

  it("serves a shared profile by handle, and hides one that isn't shared", async () => {
    const user = await makeUser();
    await profiles.setSharing(user, {
      profilePublic: true,
      handle: "anjali_n",
    });
    expect((await profiles.shared("anjali_n"))?.displayName).toBe("Anjali N");
    // The handle is matched the way it is stored, whatever case is asked for.
    expect((await profiles.shared("ANJALI_N"))?.id).toBe(user.id);

    // Turning sharing off hides it but keeps the address for next time.
    await profiles.setSharing(user, { profilePublic: false });
    expect(await profiles.shared("anjali_n")).toBeNull();
    expect((await profiles.get(user))?.handle).toBe("anjali_n");

    expect(await profiles.shared("nobody_here")).toBeNull();
    expect(await profiles.shared("!!")).toBeNull();
  });
});
