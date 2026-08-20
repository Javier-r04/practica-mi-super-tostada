import { describe, expect, test } from "bun:test";
import { LoginRateLimiter } from "./rate-limiter";

describe("LoginRateLimiter", () => {
  test("bloquea el sexto intento en la ventana", () => {
    const limiter = new LoginRateLimiter(5, 60_000);
    const now = new Date("2026-08-20T12:00:00-06:00");
    for (let i = 0; i < 5; i++) {
      expect(limiter.consume("127.0.0.1:a@b.c", now)).toBe(true);
    }
    expect(limiter.consume("127.0.0.1:a@b.c", now)).toBe(false);
    limiter.reset("127.0.0.1:a@b.c");
    expect(limiter.consume("127.0.0.1:a@b.c", now)).toBe(true);
  });
});
