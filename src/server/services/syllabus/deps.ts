import type { Clock } from "@/lib/clock";
import type { IdGenerator } from "@/lib/ids";
import type { AIProvider } from "@/server/ai/types";
import type { EntitlementSubject } from "@/server/entitlements/resolve";
import type { FlagFeature, LimitFeature } from "@/server/entitlements/config";
import type { ParseQueue } from "@/server/queue/types";
import type { Publisher } from "@/server/realtime/types";
import type { AiUsageRepository } from "@/server/repositories/ai-usage-repository";
import type { CatalogueRepository } from "@/server/repositories/catalogue-repository";
import type { ParseJobRepository } from "@/server/repositories/parse-job-repository";
import type { SectionCacheRepository } from "@/server/repositories/section-cache-repository";
import type { SyllabusRepository } from "@/server/repositories/syllabus-repository";
import type { ObjectStorage } from "@/server/storage/types";

import type { OcrProvider } from "./extract";

export type SyllabusDeps = {
  syllabuses: SyllabusRepository;
  parseJobs: ParseJobRepository;
  catalogue: CatalogueRepository;
  aiUsage: AiUsageRepository;
  sectionCache: SectionCacheRepository;
  storage: ObjectStorage;
  queue: ParseQueue;
  publisher: Publisher;
  entitlements: {
    can(user: EntitlementSubject, feature: FlagFeature | LimitFeature): boolean;
    limit(user: EntitlementSubject, feature: LimitFeature): number;
  };
  clock: Clock;
  ids: IdGenerator;
  /** The configured AI reads PDF pages and photos itself (decides which cached parse fits). */
  readsDocuments: boolean;
};

/** The worker additionally talks to the AI and OCR. */
export type ParseDeps = SyllabusDeps & { ai: AIProvider; ocr: OcrProvider };

/** The signed-in user, as these services need it. */
export type Actor = EntitlementSubject & { id: string };

export type Result<T, Code extends string = string> =
  ({ ok: true } & T) | { ok: false; code: Code; message: string };

export const failure = <Code extends string>(code: Code, message: string) =>
  ({ ok: false, code, message }) as const;

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Buffer.from(digest).toString("hex");
}
