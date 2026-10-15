// Browser side of a squad banner: shrink, send straight to storage with a presigned
// PUT, then hand the key to the action that checks and saves it.
import { preparePhoto } from "@/features/pods/upload";
import { postJson, putWithProgress } from "@/lib/http";

type Signed = { key: string; url: string; headers: Record<string, string> };

/** A banner is shown at most ~1120px wide, so 1600 is plenty. */
export async function uploadSquadCover(groupId: string, raw: File) {
  const file = await preparePhoto(raw, 1600);
  const signed = await postJson<Signed>("/api/uploads/squad", {
    groupId,
    contentType: file.type,
    size: file.size,
  });
  await putWithProgress(signed.url, file, signed.headers, () => {});
  return signed.key;
}
