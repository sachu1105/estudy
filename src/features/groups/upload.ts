// Browser side of squad uploads: shrink photos, send straight to storage with presigned
// PUTs, then hand the keys to the action that checks and saves them.
import { preparePhoto } from "@/features/pods/upload";
import { postJson, putWithProgress } from "@/lib/http";

type Signed = { key: string; url: string; headers: Record<string, string> };

/** What a chat message can carry from a device: photos, or one PDF. */
export const CHAT_FILE_TYPES =
  "image/png,image/jpeg,image/webp,application/pdf";
export const CHAT_MAX_FILES = 10;

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

/**
 * Photos or a PDF for a chat message. Returns the keys the send action takes; the server
 * checks the bytes before anyone sees them.
 */
export async function uploadChatFiles(
  groupId: string,
  channelId: string,
  raw: File[],
) {
  const files = await Promise.all(raw.map((f) => preparePhoto(f)));
  const { uploads } = await postJson<{ uploads: Signed[] }>(
    "/api/uploads/chat",
    {
      groupId,
      channelId,
      files: files.map((f) => ({ contentType: f.type, size: f.size })),
    },
  );
  await Promise.all(
    uploads.map((u, i) =>
      putWithProgress(u.url, files[i]!, u.headers, () => {}),
    ),
  );
  return uploads.map((u, i) => ({ key: u.key, name: raw[i]!.name }));
}
