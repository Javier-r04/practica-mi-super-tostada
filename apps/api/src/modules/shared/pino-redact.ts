/** El token opaco vive en la URL. Los access logs no deben guardarlo. */
export function redactPortalPath(url: string): string {
  return url.replace(/\/p\/[^/?#]+/g, "/p/[redacted]");
}

export const PINO_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-portal-token']",
  "req.headers['x-hub-signature-256']",
  "accessToken",
  "access_token",
  "accessTokenCifrado",
  "access_token_cifrado",
  "tokenPortalCifrado",
  "token_portal_cifrado",
  "bodyRenderizado",
  "body_renderizado",
  "params",
  "*.body",
  "*.text",
] as const;
