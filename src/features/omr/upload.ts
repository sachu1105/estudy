// Browser side of adding a question paper: the PDF goes straight to storage with a
// presigned PUT, then the server checks what arrived and makes the answer sheet.
import { postJson, putWithProgress } from "@/lib/http";

type Signed = { key: string; url: string; headers: Record<string, string> };

export async function uploadPaper(
  file: File,
  onProgress: (fraction: number) => void = () => {},
) {
  const { upload } = await postJson<{ upload: Signed }>("/api/uploads/omr", {
    contentType: file.type || "application/pdf",
    size: file.size,
  });
  await putWithProgress(upload.url, file, upload.headers, onProgress);
  return postJson<{ sheetId: string }>("/api/uploads/omr/complete", {
    key: upload.key,
    name: file.name,
  });
}
