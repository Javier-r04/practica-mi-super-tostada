import { describe, expect, test } from "bun:test";
import { SlidingWindowRateLimiter } from "../shared/rate-limit";
import { PortalRateLimit } from "./portal-rate-limit";

describe("PortalRateLimit", () => {
  test("el sexto hit de la misma IP en la ventana lanza LIMITE_TASA", () => {
    const limiter = new PortalRateLimit(
      new SlidingWindowRateLimiter(5, 60_000),
      new SlidingWindowRateLimiter(30, 60_000),
    );
    const now = new Date("2026-08-20T16:00:00-06:00");
    for (let i = 0; i < 5; i++) {
      limiter.consume("10.0.0.9", `hash-${i}`, now);
    }
    try {
      limiter.consume("10.0.0.9", "hash-final", now);
      throw new Error("debía lanzar");
    } catch (err) {
      expect(err).toMatchObject({ code: "LIMITE_TASA", httpStatus: 429 });
    }
  });
});
