import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { asset } from "@misupertostada/db";
import { DRIZZLE } from "../tokens";
import type { AppDatabase } from "../database.module";
import { STORAGE_PORT, type StoragePort } from "./storage.port";

export const VARIANTES = [
  { nombre: "thumb" as const, width: 320, quality: 85 },
  { nombre: "card" as const, width: 960, quality: 85 },
  { nombre: "full" as const, width: 1440, quality: 88 },
];

@Injectable()
export class AssetVariantsJob {
  private readonly logger = new Logger(AssetVariantsJob.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async generate(assetId: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(asset)
      .where(eq(asset.id, assetId))
      .limit(1);
    if (!row) return;
    if (row.ownerType !== "producto" && row.ownerType !== "cliente") return;
    if (!row.mime.startsWith("image/")) return;

    const original = await this.storage.get(row.key);
    if (!original) {
      this.logger.error(`asset ${assetId} no está en storage`);
      return;
    }

    const hash = createHash("sha256").update(original.bytes).digest("hex");
    if (hash !== row.key) {
      this.logger.error(`asset ${assetId} sha256 no coincide con la key`);
      return;
    }

    const variantes: Record<
      string,
      { key: string; width: number; mime: string; size: number }
    > = {};

    for (const def of VARIANTES) {
      const bytes = await sharp(original.bytes)
        .resize(def.width, def.width, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: def.quality })
        .toBuffer();
      const key = `${row.key}-w${def.width}.webp`;
      await this.storage.put(key, bytes, "image/webp");
      variantes[def.nombre] = {
        key,
        width: def.width,
        mime: "image/webp",
        size: bytes.length,
      };
    }

    await this.db
      .update(asset)
      .set({ variantes })
      .where(eq(asset.id, assetId));
  }
}
