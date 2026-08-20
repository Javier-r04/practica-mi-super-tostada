import { describe, expect, test } from "bun:test";
import { redactPortalPath } from "./pino-redact";

describe("redactPortalPath", () => {
  test("sustituye el token opaco y deja el resto de la ruta", () => {
    expect(redactPortalPath("/p/abcTokenOpaco/pedido")).toBe("/p/[redacted]/pedido");
    expect(redactPortalPath("/p/abcTokenOpaco")).toBe("/p/[redacted]");
    expect(redactPortalPath("/clientes")).toBe("/clientes");
  });
});
