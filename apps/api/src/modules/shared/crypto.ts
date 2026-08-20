import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env";

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export function parseEncryptionKey(hex: string | undefined): Buffer | null {
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

/**
 * AES-256-GCM. Formato: `v1.{iv}.{tag}.{ciphertext}` en base64url.
 * Cifra tokens de WABA y el token opaco del portal.
 */
export function encryptAesGcm(key: Buffer, plaintext: string): string {
  if (key.length !== KEY_BYTES) {
    throw new Error("APP_ENCRYPTION_KEY debe ser 32 bytes");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptAesGcm(key: Buffer, payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("payload cifrado inválido");
  }
  const iv = Buffer.from(parts[1]!, "base64url");
  const tag = Buffer.from(parts[2]!, "base64url");
  const encrypted = Buffer.from(parts[3]!, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("payload cifrado inválido");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

@Injectable()
export class EncryptionService {
  private readonly key: Buffer | null;

  constructor() {
    this.key = parseEncryptionKey(readEncryptionKey());
  }

  disponible(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string | null {
    if (!this.key) return null;
    return encryptAesGcm(this.key, plaintext);
  }

  decrypt(payload: string): string | null {
    if (!this.key) return null;
    try {
      return decryptAesGcm(this.key, payload);
    } catch {
      return null;
    }
  }
}

function readEncryptionKey(): string | undefined {
  try {
    return loadEnv().APP_ENCRYPTION_KEY;
  } catch {
    return process.env.APP_ENCRYPTION_KEY;
  }
}
