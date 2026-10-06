// Browser helpers for API routes. API routes aren't refreshed by proxy.ts, so a 401
// triggers one explicit refresh and a retry.

export async function withRefresh(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;
  const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
  return refreshed.ok ? fetch(input, init) : response;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
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
export function putWithProgress(
  url: string,
  file: Blob,
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
