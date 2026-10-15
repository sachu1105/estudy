import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth/session";
import { userRepository } from "@/server/repositories/user-repository";
import { profileService } from "@/server/services/profile";

const paramsSchema = z.object({ userId: z.uuid() });
const kindSchema = z.enum(["avatar", "cover"]).catch("avatar");

type Context = { params: Promise<{ userId: string }> };

/**
 * Serves a profile photo or cover by redirecting to a short-lived signed link, so the
 * storage key never reaches the browser and the image itself is never proxied.
 *
 * Who may see it: anyone signed in (avatars appear all over squads), or anyone at all
 * once that person has shared their profile. A profile that isn't shared stays behind
 * the session, which is rule 9 applied to an entrypoint that has no page of its own.
 */
export async function GET(request: Request, context: Context) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const { userId } = params.data;

  const owner = await userRepository.imageKeysOf(userId);
  if (!owner) return new NextResponse(null, { status: 404 });
  if (!owner.profilePublic && !(await getCurrentUser()))
    return new NextResponse(null, { status: 404 });

  const kind = kindSchema.parse(
    new URL(request.url).searchParams.get("kind") ?? "avatar",
  );
  const url = await profileService.signedImage(userId, kind);
  if (!url) return new NextResponse(null, { status: 404 });

  // The signed link outlives this redirect, so the browser may reuse it for a while.
  // The ?v= in the path changes when the image does, so a new photo is never masked.
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
