// Browser helpers for the upload and job routes. API routes aren't refreshed by proxy.ts,
// so a 401 triggers one explicit refresh and a retry.

async function withRefresh(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;
  const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
  return refreshed.ok ? fetch(input, init) : response;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await withRefresh(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

/** PUT with progress events, which fetch() can't report. */
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("The upload was rejected. Try again."));
    xhr.onerror = () =>
      reject(
        new Error("The upload stopped. Check your connection and try again."),
      );
    xhr.send(file);
  });
}

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
