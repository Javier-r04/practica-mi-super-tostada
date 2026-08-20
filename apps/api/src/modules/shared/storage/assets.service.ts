import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { asset } from "@misupertostada/db";
import {
  confirmAssetRequestSchema,
  presignRequestSchema,
} from "@misupertostada/shared";
import { DRIZZLE } from "../tokens";
import type { AppDatabase } from "../database.module";
import { DomainException } from "../domain.exception";
import { parseBody } from "../zod-body";
import { STORAGE_PORT, type StoragePort } from "./storage.port";
import { AssetVariantsJob } from "./variants.job";
import type { Actor } from "../../identity/actor";

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly variants: AssetVariantsJob,
  ) {}

  async presign(body: unknown) {
    const input = parseBody(presignRequestSchema, body);
    const existing = await this.byKey(input.sha256);
    if (existing) {
      return {
        alreadyUploaded: true as const,
        assetId: existing.id,
        key: existing.key,
        bucket: existing.bucket,
      };
    }
    const signed = await this.storage.presignPut(
      input.sha256,
      input.mime,
      input.size,
    );
    return {
      alreadyUploaded: false as const,
      key: input.sha256,
      bucket: this.storage.bucket,
      ...signed,
    };
  }

  async confirm(body: unknown, actor: Actor) {
    const input = parseBody(confirmAssetRequestSchema, body);
    const existing = await this.byKey(input.sha256);
    if (existing) {
      return existing;
    }

    const head = await this.storage.head(input.sha256);
    if (!head) {
      throw new DomainException(
        "ASSET_NO_ENCONTRADO",
        "El archivo aún no está en el bucket",
        409,
      );
    }
    if (head.size !== input.size) {
      throw new DomainException(
        "ASSET_TAMANO",
        "El tamaño subido no coincide",
        409,
      );
    }

    const [row] = await this.db
      .insert(asset)
      .values({
        key: input.sha256,
        bucket: this.storage.bucket,
        mime: input.mime,
        size: input.size,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        subidoPor: actor.usuarioId,
      })
      .onConflictDoNothing()
      .returning();

    const saved = row ?? (await this.byKey(input.sha256));
    if (!saved) {
      throw new DomainException("ASSET_NO_ENCONTRADO", "No se pudo registrar el archivo", 500);
    }

    if (saved.ownerType === "producto" && saved.mime.startsWith("image/")) {
      await this.variants.generate(saved.id);
    }

    return (await this.byKey(saved.key)) ?? saved;
  }

  private async byKey(key: string) {
    const [row] = await this.db
      .select()
      .from(asset)
      .where(eq(asset.key, key))
      .limit(1);
    return row ?? null;
  }
}
