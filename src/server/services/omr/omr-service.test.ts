import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { sequentialIds } from "@/lib/ids";
import { BLANK } from "@/lib/omr/marks";
import { createMemoryStorage } from "@/server/storage/memory";

import { createOmrService, type OmrDeps } from "./omr-service";

type Row = {
  id: string;
  ownerId: string;
  title: string;
  storageKey: string;
  sizeBytes: number;
  marks: number[];
  timerOn: boolean;
  timerLimitSec: number | null;
  timerElapsedSec: number;
  timerRunningSince: Date | null;
};

function setup(room = 10_000) {
  const { storage, objects } = createMemoryStorage();
  const rows = new Map<string, Row>();
  const ids = sequentialIds();
  const clock = fixedClock("2026-10-26T04:30:00Z");
  const mine = (id: string, ownerId: string) =>
    rows.get(id)?.ownerId === ownerId ? rows.get(id)! : null;
  const sheets = {
    async create(data: Omit<Row, "id" | `timer${string}`>) {
      const id = ids.next();
      rows.set(id, {
        id,
        ...data,
        timerOn: false,
        timerLimitSec: null,
        timerElapsedSec: 0,
        timerRunningSince: null,
      });
      return { id };
    },
    async listOwned(ownerId: string) {
      return [...rows.values()].filter((r) => r.ownerId === ownerId);
    },
    async findOwned(id: string, ownerId: string) {
      return mine(id, ownerId);
    },
    async setMarks(id: string, ownerId: string, marks: number[]) {
      const row = mine(id, ownerId);
      if (row) row.marks = marks;
      return !!row;
    },
    async setTimer(id: string, ownerId: string, timer: Partial<Row>) {
      const row = mine(id, ownerId);
      if (row) Object.assign(row, timer);
      return !!row;
    },
    async rename(id: string, ownerId: string, title: string) {
      const row = mine(id, ownerId);
      if (row) row.title = title;
      return !!row;
    },
    async delete(id: string, ownerId: string) {
      return !!mine(id, ownerId) && rows.delete(id);
    },
    async bytesUsed(ownerId: string) {
      return [...rows.values()]
        .filter((r) => r.ownerId === ownerId)
        .reduce((n, r) => n + r.sizeBytes, 0);
    },
  } as unknown as OmrDeps["sheets"];
  const service = createOmrService({
    sheets,
    podBytesUsed: async () => 0,
    storage,
    ids,
    clock,
    limit: () => room,
    pageCount: async () => 3,
  });
  return { service, objects, rows, clock };
}

const user = { id: "00000000-0000-4000-8000-0000000000aa" } as never;
const other = { id: "00000000-0000-4000-8000-0000000000bb" } as never;
const pdf = new TextEncoder().encode("%PDF-1.7 a question paper");

async function uploaded(s: ReturnType<typeof setup>, body = pdf) {
  const signed = await s.service.requestUpload(user, {
    contentType: "application/pdf",
    size: body.byteLength,
  });
  if (!signed.ok) throw new Error(signed.message);
  s.objects.set(signed.upload.key, { body, contentType: "application/pdf" });
  return signed.upload.key;
}

describe("omr sheets", () => {
  it("takes a PDF and gives it a blank 100-question sheet", async () => {
    const s = setup();
    const key = await uploaded(s);
    const made = await s.service.completeUpload(user, {
      key,
      name: "LDC 2024 Paper.pdf",
    });
    expect(made.ok).toBe(true);
    const sheet = await s.service.get(
      user,
      (made as { sheetId: string }).sheetId,
    );
    expect(sheet?.title).toBe("LDC 2024 Paper");
    expect(sheet?.pageCount).toBe(3);
    expect(sheet?.marks).toHaveLength(100);
    expect(sheet?.marks.every((m) => m === BLANK)).toBe(true);
  });

  it("refuses anything that isn't a PDF, and deletes what arrived", async () => {
    const s = setup();
    expect(
      (
        await s.service.requestUpload(user, {
          contentType: "image/png",
          size: 10,
        })
      ).ok,
    ).toBe(false);
    const key = await uploaded(s, new TextEncoder().encode("not a pdf at all"));
    const made = await s.service.completeUpload(user, { key, name: "x.pdf" });
    expect(made.ok).toBe(false);
    expect(s.objects.has(key)).toBe(false);
  });

  it("keeps to the plan's storage", async () => {
    const s = setup(10);
    const signed = await s.service.requestUpload(user, {
      contentType: "application/pdf",
      size: 11,
    });
    expect(signed.ok).toBe(false);
  });

  it("keeps each sheet to its owner", async () => {
    const s = setup();
    const key = await uploaded(s);
    const { sheetId } = (await s.service.completeUpload(user, {
      key,
      name: "p.pdf",
    })) as { sheetId: string };
    // Someone else's key never completes for this user.
    expect(
      (await s.service.completeUpload(other, { key, name: "p.pdf" })).ok,
    ).toBe(false);
    expect(await s.service.get(other, sheetId)).toBeNull();
    expect(await s.service.viewUrl(other, sheetId)).toBeNull();
    expect(await s.service.saveMarks(other, sheetId, [1])).toBe(false);
    expect(await s.service.remove(other, sheetId)).toBe(false);

    expect(await s.service.saveMarks(user, sheetId, [1, 9, 3])).toBe(true);
    expect((await s.service.get(user, sheetId))?.marks.slice(0, 4)).toEqual([
      1,
      BLANK,
      3,
      BLANK,
    ]);
    expect(await s.service.remove(user, sheetId)).toBe(true);
    expect(s.objects.has(key)).toBe(false);
    expect(s.rows.size).toBe(0);
  });

  it("keeps time on the server: a reload sees the clock still running", async () => {
    const s = setup();
    const key = await uploaded(s);
    const { sheetId } = (await s.service.completeUpload(user, {
      key,
      name: "p.pdf",
    })) as { sheetId: string };
    expect((await s.service.get(user, sheetId))?.timer.on).toBe(false);

    const started = await s.service.timer(user, sheetId, {
      op: "start",
      limitMin: 75,
    });
    expect(started).toEqual({
      on: true,
      limitSec: 4500,
      elapsedSec: 0,
      running: true,
    });
    s.clock.advance(90_000);
    expect((await s.service.get(user, sheetId))?.timer.elapsedSec).toBe(90);

    await s.service.timer(user, sheetId, { op: "pause" });
    s.clock.advance(600_000);
    expect((await s.service.get(user, sheetId))?.timer).toMatchObject({
      elapsedSec: 90,
      running: false,
    });
    await s.service.timer(user, sheetId, { op: "resume" });
    s.clock.advance(10_000);
    expect((await s.service.list(user))[0]?.timer.elapsedSec).toBe(100);

    expect(await s.service.timer(other, sheetId, { op: "reset" })).toBeNull();
    expect(await s.service.timer(user, sheetId, { op: "reset" })).toEqual({
      on: false,
      limitSec: null,
      elapsedSec: 0,
      running: false,
    });
  });
});
