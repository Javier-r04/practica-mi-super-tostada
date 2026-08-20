import { describe, expect, test } from "bun:test";
import {
  decryptAesGcm,
  encryptAesGcm,
  parseEncryptionKey,
} from "./crypto";

const KEY = parseEncryptionKey("ab".repeat(32))!;

describe("AES-256-GCM", () => {
  test("cifra y descifra el token del portal", () => {
    const plain = "dev-tabasco-casa-vieja-portal-token";
    const cifrado = encryptAesGcm(KEY, plain);
    expect(cifrado).not.toBe(plain);
    expect(cifrado.startsWith("v1.")).toBe(true);
    expect(decryptAesGcm(KEY, cifrado)).toBe(plain);
  });

  test("el mismo texto produce ciphertext distinto (IV aleatorio)", () => {
    const a = encryptAesGcm(KEY, "mismo");
    const b = encryptAesGcm(KEY, "mismo");
    expect(a).not.toBe(b);
    expect(decryptAesGcm(KEY, a)).toBe("mismo");
    expect(decryptAesGcm(KEY, b)).toBe("mismo");
  });

  test("rechaza clave que no son 32 bytes hex y payload adulterado", () => {
    expect(parseEncryptionKey("abc")).toBeNull();
    expect(parseEncryptionKey(undefined)).toBeNull();
    const cifrado = encryptAesGcm(KEY, "secreto");
    expect(() => decryptAesGcm(KEY, cifrado.slice(0, -2) + "zz")).toThrow();
  });
});
