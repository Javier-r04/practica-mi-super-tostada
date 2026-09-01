import { describe, expect, test } from "bun:test";
import { R2StorageAdapter } from "./r2.storage";
import type { Env } from "../../../config/env";

const baseEnv = {
  NODE_ENV: "development" as const,
  DATABASE_URL: "postgres://local",
  WEB_ORIGIN: "http://localhost:3000",
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "bucket",
  R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  SESSION_COOKIE_NAME: "session",
  SESSION_TTL_SECONDS: 604800,
  META_GRAPH_VERSION: "v21.0",
};

describe("R2StorageAdapter", () => {
  test("en development presign devuelve proxy por la API", async () => {
    const storage = new R2StorageAdapter(baseEnv as Env);
    const signed = await storage.presignPut("abc123", "image/jpeg", 1024);
    expect(signed.url).toBe("/internal/storage/abc123");
    expect(signed.headers["content-type"]).toBe("image/jpeg");
    expect(signed.method).toBe("PUT");
  });

  test("en production presign apunta a R2", async () => {
    const storage = new R2StorageAdapter({
      ...baseEnv,
      NODE_ENV: "production",
      APP_ENCRYPTION_KEY: "a".repeat(64),
    } as Env);
    const signed = await storage.presignPut("abc123", "image/jpeg", 1024);
    expect(signed.url).toContain("example.r2.cloudflarestorage.com");
    expect(signed.headers["content-length"]).toBe("1024");
  });
});
