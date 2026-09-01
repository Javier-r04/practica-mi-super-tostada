export type StoredObject = {
  key: string;
  mime: string;
  size: number;
  bytes?: Buffer;
};

export const STORAGE_PORT = Symbol("STORAGE_PORT");

export interface StoragePort {
  readonly bucket: string;
  presignPut(
    key: string,
    mime: string,
    size: number,
  ): Promise<{ url: string; headers: Record<string, string>; method: "PUT" }>;
  /** URL directa al objeto (R2 público o prefirmada). `null` → usar proxy de la API. */
  presignGet(key: string, expiresInSeconds?: number): Promise<string | null>;
  put(key: string, bytes: Buffer, mime: string): Promise<void>;
  head(key: string): Promise<{ size: number; mime: string } | null>;
  get(key: string): Promise<{ bytes: Buffer; mime: string } | null>;
}
