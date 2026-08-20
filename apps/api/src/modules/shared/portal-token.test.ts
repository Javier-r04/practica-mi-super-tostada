import { describe, expect, test } from "bun:test";
import { hashPortalToken } from "./portal-token";

describe("hashPortalToken", () => {
  test("es sha256 hex y no coincide con el opaco", () => {
    const raw = "dev-tabasco-casa-vieja-portal-token";
    const hash = hashPortalToken(raw);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash).not.toBe(raw);
    expect(hashPortalToken(raw)).toBe(hash);
    expect(hashPortalToken("otro")).not.toBe(hash);
  });
});
