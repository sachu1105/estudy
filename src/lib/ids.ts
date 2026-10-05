import { z } from "zod";

// All ids are uuid strings (CLAUDE.md rule 12).

export const idSchema = z.uuid();

export type Id = z.infer<typeof idSchema>;

export interface IdGenerator {
  next(): Id;
}

export const randomIds: IdGenerator = {
  next: () => crypto.randomUUID(),
};

/** Deterministic ids for tests and fixtures: 00000000-0000-4000-8000-000000000001, ... */
export function sequentialIds(start = 1): IdGenerator {
  let counter = start;
  return {
    next: () =>
      `00000000-0000-4000-8000-${(counter++).toString(16).padStart(12, "0")}`,
  };
}

export function newId(): Id {
  return randomIds.next();
}

export function isId(value: unknown): value is Id {
  return idSchema.safeParse(value).success;
}
