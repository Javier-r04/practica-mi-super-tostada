/**
 * Base contra la que corren los tests. **Nunca** la de desarrollo.
 *
 * `dev-all.ts` levanta `bun test --watch` junto a los servidores, así que la
 * suite entera corre en cada guardado. Los e2e se aíslan creando una
 * organización por test y no truncan nada: apuntando a la base de desarrollo,
 * cada guardado dejaba cientos de organizaciones muertas. En agosto de 2026 la
 * base tenía 31 003 organizaciones activas, 31 002 de ellas basura de tests, y
 * el cron de cierre las recorría todas cada minuto.
 *
 * Por defecto se deriva de `DATABASE_URL` añadiendo `_test` al nombre de la
 * base, para que nadie tenga que acordarse de configurarla. `TEST_DATABASE_URL`
 * la sobreescribe.
 *
 * Crearla: `bun run db:test:setup`.
 */
export function testDatabaseUrl(): string {
  const explicita = process.env.TEST_DATABASE_URL;
  if (explicita) return explicita;

  const base =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/misupertostada";
  return conSufijoTest(base);
}

export function conSufijoTest(url: string): string {
  const parsed = new URL(url);
  const nombre = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!nombre) throw new Error("La URL de base de datos no incluye el nombre");
  if (nombre.endsWith("_test")) return url;
  parsed.pathname = `/${nombre}_test`;
  return parsed.toString();
}
