// Runs once when the Next.js server boots. Importing env here makes a missing or
// malformed variable crash the server immediately instead of on the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./server/env");
  }
}
