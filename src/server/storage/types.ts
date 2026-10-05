/** S3-compatible object storage, as the services see it. MinIO in dev, R2 or S3 in production. */
export interface ObjectStorage {
  /**
   * A presigned PUT the browser uploads to directly. Content-Type and Content-Length are
   * signed, so the upload must match what was declared.
   */
  signUpload(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; headers: Record<string, string> }>;
  /** Size and type of a stored object, or null when it doesn't exist. */
  head(
    key: string,
  ): Promise<{ size: number; contentType: string | null } | null>;
  getBytes(key: string): Promise<Uint8Array>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}
