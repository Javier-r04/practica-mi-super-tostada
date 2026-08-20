import { describe, expect, test } from "bun:test";
import { envelopeFail, envelopeOk, envelopeSchema } from "./envelope";

describe("envelope API", () => {
  test("éxito: success true, data presente, error null", () => {
    const body = envelopeOk({ status: "ok" });
    expect(body).toEqual({
      success: true,
      data: { status: "ok" },
      error: null,
    });
    expect(envelopeSchema.safeParse(body).success).toBe(true);
  });

  test("error: success false, data null, mensaje de dominio", () => {
    const body = envelopeFail("VENTANA_CERRADA", "La ventana de pedido está cerrada");
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "VENTANA_CERRADA",
      message: "La ventana de pedido está cerrada",
    });
    expect(envelopeSchema.safeParse(body).success).toBe(true);
  });
});
