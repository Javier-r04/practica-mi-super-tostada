import { describe, expect, test } from "bun:test";
import { DomainException } from "./domain.exception";
import { envelopeFail } from "@misupertostada/shared";
import { DomainExceptionFilter } from "./domain-exception.filter";

describe("DomainException", () => {
  test("expone código HTTP y mensaje de dominio", () => {
    const err = new DomainException(
      "VENTANA_CERRADA",
      "La ventana de pedido está cerrada",
      409,
    );
    expect(err.code).toBe("VENTANA_CERRADA");
    expect(err.httpStatus).toBe(409);
    expect(err.message).toContain("ventana");
  });
});

describe("DomainExceptionFilter", () => {
  test("mapea DomainException al envelope { success, data, error }", () => {
    const filter = new DomainExceptionFilter();
    let status = 0;
    let body: unknown;
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status(code: number) {
            status = code;
            return this;
          },
          json(payload: unknown) {
            body = payload;
            return this;
          },
        }),
      }),
    };

    filter.catch(
      new DomainException("VENTANA_CERRADA", "La ventana de pedido está cerrada", 409),
      host as never,
    );

    expect(status).toBe(409);
    expect(body).toEqual(
      envelopeFail("VENTANA_CERRADA", "La ventana de pedido está cerrada"),
    );
  });
});
