import { describe, expect, test } from "bun:test";
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const passwords = new PasswordService();

  test("hashea con argon2id y verifica el original", async () => {
    const hash = await passwords.hash("clave-de-prueba-10");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await passwords.verify(hash, "clave-de-prueba-10")).toBe(true);
    expect(await passwords.verify(hash, "otra")).toBe(false);
  });
});
