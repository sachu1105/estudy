import type { ObjectStorage } from "./types";

/** In-memory storage for tests. `objects` is exposed so tests can simulate uploads. */
export function createMemoryStorage() {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const storage: ObjectStorage = {
    async signUpload({ key, contentType }) {
      return {
        url: `memory://upload/${key}`,
        headers: { "Content-Type": contentType },
      };
    },
    async head(key) {
      const object = objects.get(key);
      return object
        ? { size: object.body.byteLength, contentType: object.contentType }
        : null;
    },
    async signDownload(key) {
      return `memory://download/${key}`;
    },
    async getBytes(key) {
      const object = objects.get(key);
      if (!object) throw new Error(`No object ${key}`);
      return object.body;
    },
    async put(key, body, contentType) {
      objects.set(key, { body, contentType });
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  return { storage, objects };
}
