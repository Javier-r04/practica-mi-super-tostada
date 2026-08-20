import { describe, expect, test } from "bun:test";
import { loginRequestSchema, usernameSchema } from "./auth";

describe("usernameSchema", () => {
  test("acepta usuarios cortos en minúscula", () => {
    expect(usernameSchema.parse("Cristian")).toBe("cristian");
    expect(usernameSchema.parse(" tony ")).toBe("tony");
  });

  test("rechaza correo y nombres inválidos", () => {
    expect(usernameSchema.safeParse("cristian@local.test").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("1tony").success).toBe(false);
  });
});

describe("loginRequestSchema", () => {
  test("exige username, no email", () => {
    const ok = loginRequestSchema.safeParse({
      username: "cristian",
      password: "dev-local-only",
    });
    expect(ok.success).toBe(true);
    expect(
      loginRequestSchema.safeParse({
        email: "cristian@local.test",
        password: "dev-local-only",
      }).success,
    ).toBe(false);
  });
});
