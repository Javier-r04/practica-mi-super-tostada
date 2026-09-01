import type { StoragePort } from "./storage.port";

export class FakeStorageAdapter implements StoragePort {
  readonly bucket = "fake-local";
  private readonly objects = new Map<
    string,
    { bytes: Buffer; mime: string }
  >();

  async presignPut(
    key: string,
    mime: string,
    _size: number,
  ): Promise<{ url: string; headers: Record<string, string>; method: "PUT" }> {
    return {
      url: `/internal/storage/${encodeURIComponent(key)}`,
      headers: { "content-type": mime },
      method: "PUT",
    };
  }

  async presignGet(): Promise<string | null> {
    return null;
  }

  async put(key: string, bytes: Buffer, mime: string): Promise<void> {
    this.objects.set(key, { bytes, mime });
  }

  async head(key: string): Promise<{ size: number; mime: string } | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return { size: obj.bytes.length, mime: obj.mime };
  }

  async get(
    key: string,
  ): Promise<{ bytes: Buffer; mime: string } | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return { bytes: obj.bytes, mime: obj.mime };
  }
}
