import { z } from "zod";

export const ASSET_OWNER_TYPES = [
  "producto",
  "pago",
  "abono",
  "entrega",
  "cliente",
] as const;
export type AssetOwnerType = (typeof ASSET_OWNER_TYPES)[number];

export const ASSET_MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AssetMime = (typeof ASSET_MIME_PERMITIDOS)[number];

export const ASSET_MAX_BYTES = 8 * 1024 * 1024;

export const SHA256_HEX = /^[a-f0-9]{64}$/;

export const presignRequestSchema = z.object({
  ownerType: z.enum(ASSET_OWNER_TYPES),
  ownerId: z.string().uuid(),
  mime: z.enum(ASSET_MIME_PERMITIDOS),
  size: z.number().int().positive().max(ASSET_MAX_BYTES),
  sha256: z.string().regex(SHA256_HEX),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const confirmAssetRequestSchema = z.object({
  ownerType: z.enum(ASSET_OWNER_TYPES),
  ownerId: z.string().uuid(),
  mime: z.enum(ASSET_MIME_PERMITIDOS),
  size: z.number().int().positive().max(ASSET_MAX_BYTES),
  sha256: z.string().regex(SHA256_HEX),
});

export type ConfirmAssetRequest = z.infer<typeof confirmAssetRequestSchema>;
