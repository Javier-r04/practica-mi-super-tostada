import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../../../config/env";
import type { StoragePort } from "./storage.port";

export class R2StorageAdapter implements StoragePort {
  readonly bucket: string;
  private readonly client: S3Client;

  constructor(env: Env) {
    this.bucket = env.R2_BUCKET!;
    this.client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async presignPut(
    key: string,
    mime: string,
    size: number,
  ): Promise<{ url: string; headers: Record<string, string>; method: "PUT" }> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mime,
        ContentLength: size,
      }),
      { expiresIn: 600 },
    );
    return {
      url,
      headers: { "content-type": mime, "content-length": String(size) },
      method: "PUT",
    };
  }

  async put(key: string, bytes: Buffer, mime: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
      }),
    );
  }

  async head(key: string): Promise<{ size: number; mime: string } | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: res.ContentLength ?? 0,
        mime: res.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<{ bytes: Buffer; mime: string } | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) return null;
      const bytes = Buffer.from(await res.Body.transformToByteArray());
      return {
        bytes,
        mime: res.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}
