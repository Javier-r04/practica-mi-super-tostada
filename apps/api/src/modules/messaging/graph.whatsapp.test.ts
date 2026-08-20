import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verificarFirmaMeta } from "./graph.whatsapp";

describe("verificarFirmaMeta", () => {
  test("acepta HMAC-SHA256 de X-Hub-Signature-256 y rechaza body adulterado", () => {
    const secret = "app-secret";
    const raw = Buffer.from(`{"object":"whatsapp_business_account"}`, "utf8");
    const header = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(verificarFirmaMeta(raw, header, secret)).toBe(true);
    expect(verificarFirmaMeta(Buffer.from("nope"), header, secret)).toBe(false);
    expect(verificarFirmaMeta(raw, "sha256=deadbeef", secret)).toBe(false);
  });
});
