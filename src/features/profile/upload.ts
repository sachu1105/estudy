// Browser side of a profile photo or cover: shrink, send straight to storage with a
// presigned PUT, then hand the key to the action that checks and saves it.
import { postJson, putWithProgress } from "@/lib/http";
import { preparePhoto } from "@/features/pods/upload";

type Signed = { key: string; url: string; headers: Record<string, string> };

/** A photo is shown at most ~128px, a cover at most ~1120px wide. */
const MAX_SIDE = { avatar: 512, cover: 1600 } as const;

export async function uploadProfileImage(
  kind: "avatar" | "cover",
  raw: File,
  onProgress: (fraction: number) => void = () => {},
) {
  const file = await preparePhoto(raw, MAX_SIDE[kind]);
  const signed = await postJson<Signed>("/api/uploads/profile", {
    kind,
    contentType: file.type,
    size: file.size,
  });
  await putWithProgress(signed.url, file, signed.headers, onProgress);
  return signed.key;
}
