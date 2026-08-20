/** El token opaco vive en la URL. Los access logs no deben guardarlo. */
export function redactPortalPath(url: string): string {
  return url.replace(/\/p\/[^/?#]+/g, "/p/[redacted]");
}
