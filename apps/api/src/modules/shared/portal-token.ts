import { createHash } from "node:crypto";

export function hashPortalToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
