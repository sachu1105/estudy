// Browser side of adding files to a pod: photos are shrunk before upload, then each file
// goes straight to storage with a presigned PUT, then the server checks what arrived.
import { postJson, putWithProgress } from "@/lib/http";

const MAX_SIDE = 2000;

/**
 * A photo resized to at most 2000px and re-encoded as JPEG. Orientation from the camera's
 * EXIF data is applied, so the page comes out upright. Other files pass through.
 */
export async function preparePhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

type Signed = { key: string; url: string; headers: Record<string, string> };

async function putAll(files: File[], onProgress: (fraction: number) => void) {
  const { uploads } = await postJson<{ uploads: Signed[] }>(
    "/api/uploads/pod",
    {
      files: files.map((f) => ({ contentType: f.type, size: f.size })),
    },
  );
  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  const done = new Array<number>(files.length).fill(0);
  await Promise.all(
    files.map((file, i) =>
      putWithProgress(uploads[i].url, file, uploads[i].headers, (f) => {
        done[i] = f * file.size;
        onProgress(done.reduce((a, b) => a + b, 0) / total);
      }),
    ),
  );
  return uploads;
}

/** Adds files to a pod: a PDF or photo each, or all the photos as one document. */
export async function uploadPodFiles(
  podId: string,
  raw: File[],
  options: { asDocument?: boolean; title?: string | null; topicIds?: string[] },
  onProgress: (fraction: number) => void = () => {},
) {
  const files = await Promise.all(raw.map(preparePhoto));
  const uploads = await putAll(files, onProgress);
  return postJson<{ itemIds: string[] }>("/api/uploads/pod/complete", {
    podId,
    keys: uploads.map((u, i) => ({ key: u.key, name: raw[i].name })),
    asDocument: options.asDocument ?? false,
    title: options.title ?? null,
    topicIds: options.topicIds ?? [],
  });
}

/** An image placed inside a note; returns the src the editor inserts. */
export async function uploadNoteImage(itemId: string, raw: File) {
  const [upload] = await putAll([await preparePhoto(raw)], () => {});
  const { src } = await postJson<{ src: string }>(
    "/api/uploads/pod/note-image",
    {
      itemId,
      key: upload.key,
    },
  );
  return src;
}
