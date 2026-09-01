import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { asset, abono } from "@misupertostada/db";
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
      if (input.ownerType === "abono") {
        return this.reconciliarAssetAbonoPortal(existing, input.ownerId);
      }
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

    if (
      (saved.ownerType === "producto" || saved.ownerType === "cliente") &&
      saved.mime.startsWith("image/")
    ) {
      await this.variants.generate(saved.id);
    }

    return (await this.byKey(saved.key)) ?? saved;
  }

  /** Portal: comprobante de abono sin sesión de usuario interno. */
  async confirmPortal(body: unknown) {
    const input = parseBody(confirmAssetRequestSchema, body);
    if (input.ownerType !== "abono") {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "Solo se permiten comprobantes de abono",
        403,
      );
    }
    const existing = await this.byKey(input.sha256);
    if (existing) {
      return this.reconciliarAssetAbonoPortal(existing, input.ownerId);
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
        subidoPor: null,
      })
      .onConflictDoNothing()
      .returning();

    const saved = row ?? (await this.byKey(input.sha256));
    if (!saved) {
      throw new DomainException("ASSET_NO_ENCONTRADO", "No se pudo registrar el archivo", 500);
    }
    return saved;
  }

  async presignPortal(body: unknown) {
    const input = parseBody(presignRequestSchema, body);
    if (input.ownerType !== "abono") {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "Solo se permiten comprobantes de abono",
        403,
      );
    }
    return this.presign(body);
  }

  private async reconciliarAssetAbonoPortal(
    existing: typeof asset.$inferSelect,
    ownerId: string,
  ) {
    if (existing.ownerId === ownerId) return existing;
    const [abonoViejo] = await this.db
      .select({ id: abono.id })
      .from(abono)
      .where(eq(abono.id, existing.ownerId))
      .limit(1);
    if (abonoViejo) {
      throw new DomainException(
        "COMPROBANTE_EN_USO",
        "Este comprobante ya está ligado a otro reporte",
        409,
      );
    }
    const [actualizado] = await this.db
      .update(asset)
      .set({ ownerId })
      .where(eq(asset.id, existing.id))
      .returning();
    return actualizado ?? existing;
  }

  async getViewUrl(id: string, apiBaseUrl: string): Promise<string> {
    const row = await this.findById(id);
    const direct = await this.storage.presignGet(row.key);
    if (direct) return direct;
    return `${apiBaseUrl.replace(/\/$/, "")}/assets/${id}`;
  }

  async getContent(
    id: string,
    variante?: "thumb" | "card",
  ): Promise<{ bytes: Buffer; mime: string }> {
    const row = await this.findById(id);

    let key = row.key;
    let mime = row.mime;
    if (variante) {
      const variantes = row.variantes as
        | Record<string, { key: string; mime?: string } | undefined>
        | null;
      const v = variantes?.[variante];
      if (v?.key) {
        key = v.key;
        mime = v.mime ?? "image/webp";
      }
    }

    const obj = await this.storage.get(key);
    if (!obj) {
      throw new DomainException(
        "ASSET_NO_ENCONTRADO",
        "El archivo no está en el almacenamiento",
        404,
      );
    }
    return { bytes: obj.bytes, mime: obj.mime || mime };
  }

  private async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(asset)
      .where(eq(asset.id, id))
      .limit(1);
    if (!row) {
      throw new DomainException("ASSET_NO_ENCONTRADO", "Archivo no encontrado", 404);
    }
    return row;
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
