import type { IdGenerator } from "@/lib/ids";
import { blankMarks, normaliseMarks } from "@/lib/omr/marks";
import type { EntitlementSubject } from "@/server/entitlements/resolve";
import type { LimitFeature } from "@/server/entitlements/config";
import type { OmrSheetRepository } from "@/server/repositories/omr-sheet-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, sha256Hex, type Result } from "../syllabus/deps";
import { sniffKind } from "../syllabus/extract";

export type OmrDeps = {
  sheets: Pick<
    OmrSheetRepository,
    | "create"
    | "listOwned"
    | "findOwned"
    | "setMarks"
    | "rename"
    | "delete"
    | "bytesUsed"
  >;
  /** Bytes the user already keeps in pods; question papers share that room. */
  podBytesUsed: (ownerId: string) => Promise<number>;
  storage: ObjectStorage;
  ids: IdGenerator;
  limit: (user: EntitlementSubject, feature: LimitFeature) => number;
  pageCount: (bytes: Uint8Array) => Promise<number | null>;
};

type User = EntitlementSubject & { id: string };

export const PAPER_MAX_BYTES = 25 * 1024 * 1024;
/** Signed links to a paper last this long (rule 15). */
const VIEW_SECONDS = 300;

/**
 * Practice from a question paper: the user uploads its PDF and marks an OMR sheet beside
 * it. Private to the user (rule 15); the PDF counts against their pod storage.
 */
export function createOmrService(deps: OmrDeps) {
  const keyPattern = (userId: string) =>
    new RegExp(`^omr/${userId}/[0-9a-f-]{36}$`);

  async function room(user: User, adding: number) {
    const max = deps.limit(user, "vaultStorageBytes");
    const used =
      (await deps.podBytesUsed(user.id)) +
      (await deps.sheets.bytesUsed(user.id));
    return used + adding <= max
      ? null
      : failure(
          "STORAGE_FULL",
          `Your storage is full (${Math.round(max / 1024 / 1024)} MB on your plan). Delete a paper or some pod files.`,
        );
  }

  return {
    async list(user: User) {
      const sheets = await deps.sheets.listOwned(user.id);
      return sheets.map((s) => ({ ...s, marks: normaliseMarks(s.marks) }));
    },

    async get(user: User, id: string) {
      const sheet = await deps.sheets.findOwned(id, user.id);
      if (!sheet) return null;
      return {
        id: sheet.id,
        title: sheet.title,
        pageCount: sheet.pageCount,
        marks: normaliseMarks(sheet.marks),
      };
    },

    /** A presigned PUT for one PDF; checks type, size and the plan's room. */
    async requestUpload(
      user: User,
      file: { contentType: string; size: number },
    ): Promise<
      Result<{
        upload: { key: string; url: string; headers: Record<string, string> };
      }>
    > {
      if (file.contentType !== "application/pdf")
        return failure("UNSUPPORTED", "Choose a PDF of the question paper.");
      if (file.size > PAPER_MAX_BYTES)
        return failure("TOO_LARGE", "The PDF can be up to 25 MB.");
      const full = await room(user, file.size);
      if (full) return full;
      const key = `omr/${user.id}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: file.contentType,
        contentLength: file.size,
        expiresInSeconds: 600,
      });
      return { ok: true, upload: { key, ...signed } };
    },

    /** The PUT finished: check it really is a PDF, then make the sheet. */
    async completeUpload(
      user: User,
      input: { key: string; name: string },
    ): Promise<Result<{ sheetId: string }>> {
      const bad = failure(
        "UNSUPPORTED",
        "The file didn't upload properly or isn't a PDF. Try again.",
      );
      if (!keyPattern(user.id).test(input.key)) return bad;
      const head = await deps.storage.head(input.key);
      if (!head || head.size > PAPER_MAX_BYTES) return bad;
      const bytes = await deps.storage.getBytes(input.key);
      if (sniffKind(bytes) !== "PDF") {
        await deps.storage.delete(input.key);
        return bad;
      }
      const full = await room(user, 0);
      if (full) {
        await deps.storage.delete(input.key);
        return full;
      }
      const pageCount = await deps.pageCount(bytes).catch(() => null);
      const sheet = await deps.sheets.create({
        ownerId: user.id,
        title:
          input.name
            .replace(/\.pdf$/i, "")
            .trim()
            .slice(0, 120) || "Question paper",
        storageKey: input.key,
        sizeBytes: bytes.byteLength,
        sha256: await sha256Hex(bytes),
        pageCount,
        marks: blankMarks(),
      });
      return { ok: true, sheetId: sheet.id };
    },

    async saveMarks(user: User, id: string, marks: number[]) {
      return deps.sheets.setMarks(id, user.id, normaliseMarks(marks));
    },

    async rename(user: User, id: string, title: string) {
      return deps.sheets.rename(id, user.id, title);
    },

    async remove(user: User, id: string) {
      const sheet = await deps.sheets.findOwned(id, user.id);
      if (!sheet) return false;
      await deps.sheets.delete(id, user.id);
      await deps.storage.delete(sheet.storageKey).catch(() => {});
      return true;
    },

    /** A 5-minute link to the user's own paper (rule 15). */
    async viewUrl(user: User, id: string) {
      const sheet = await deps.sheets.findOwned(id, user.id);
      if (!sheet) return null;
      return deps.storage.signDownload(sheet.storageKey, {
        contentType: "application/pdf",
        expiresInSeconds: VIEW_SECONDS,
      });
    },
  };
}

export type OmrService = ReturnType<typeof createOmrService>;
