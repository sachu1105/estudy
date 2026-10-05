import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ObjectStorage } from "./types";

type S3Config = {
  endpoint: string;
  publicEndpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function client(config: S3Config, endpoint: string) {
  return new S3Client({
    endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Don't add CRC checksums the browser's plain PUT wouldn't send.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function createS3Storage(config: S3Config): ObjectStorage {
  const s3 = client(config, config.endpoint);
  // Signed URLs must name the host the browser will reach.
  const signer = config.publicEndpoint
    ? client(config, config.publicEndpoint)
    : s3;
  const Bucket = config.bucket;

  return {
    async signUpload({ key, contentType, contentLength, expiresInSeconds }) {
      const command = new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });
      const url = await getSignedUrl(signer, command, {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      // The browser sets Content-Length itself; it only has to send this header.
      return { url, headers: { "Content-Type": contentType } };
    },

    async head(key) {
      try {
        const result = await s3.send(
          new HeadObjectCommand({ Bucket, Key: key }),
        );
        return {
          size: result.ContentLength ?? 0,
          contentType: result.ContentType ?? null,
        };
      } catch (error) {
        if (
          error instanceof NotFound ||
          (error as { name?: string }).name === "NotFound"
        )
          return null;
        throw error;
      }
    },

    async getBytes(key) {
      const result = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!result.Body) throw new Error(`Object ${key} has no body`);
      return result.Body.transformToByteArray();
    },

    async put(key, body, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}
