// Browser helpers for the syllabus upload and job routes.
import { postJson, putWithProgress, withRefresh } from "@/lib/http";

export async function uploadSyllabusFile(
  file: File,
  meta: { title: string; examId: string | null },
  onProgress: (fraction: number) => void,
) {
  const signed = await postJson<{
    key: string;
    url: string;
    headers: Record<string, string>;
  }>("/api/uploads/syllabus", { contentType: file.type, size: file.size });
  await putWithProgress(signed.url, file, signed.headers, onProgress);
  return postJson<{ versionId: string; jobId: string }>(
    "/api/uploads/syllabus/complete",
    {
      key: signed.key,
      title: meta.title,
      examId: meta.examId,
      sourceName: file.name.slice(0, 255),
    },
  );
}

export async function fetchJob(id: string) {
  const response = await withRefresh(`/api/jobs/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Couldn't load the job status.");
  return response.json();
}
