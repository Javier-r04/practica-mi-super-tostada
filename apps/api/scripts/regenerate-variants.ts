/**
 * Regenera las variantes de imágenes (thumb, card, full) para los assets
 * de productos y clientes guardados en R2.
 *
 * Uso:
 *   bun apps/api/scripts/regenerate-variants.ts
 *   bun apps/api/scripts/regenerate-variants.ts <assetId>
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { asset, producto, cliente } from "@misupertostada/db";
import { isNotNull } from "drizzle-orm";
import { loadEnv, r2Configured } from "../src/config/env";
import { R2StorageAdapter } from "../src/modules/shared/storage/r2.storage";
import { VARIANTES } from "../src/modules/shared/storage/variants.job";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const env = loadEnv();
if (!r2Configured(env)) {
  console.error("❌ Faltan variables R2_* en .env");
  process.exit(1);
}

const storage = new R2StorageAdapter(env);
const client = postgres(env.DATABASE_URL);
const db = drizzle(client);

const arg = process.argv[2];
const processAll = arg === "--all";
const targetAssetId = arg && !arg.startsWith("--") ? arg : undefined;

console.log("🚀 Iniciando regeneración de variantes de imágenes...");
console.log(`📦 Bucket: ${env.R2_BUCKET}`);
console.log(
  `📐 Variantes configuradas: ${VARIANTES.map((v) => `${v.nombre} (w${v.width} @ ${v.quality}%)`).join(", ")}`,
);

try {
  let targetIds: string[] | undefined;

  if (targetAssetId) {
    targetIds = [targetAssetId];
  } else if (!processAll) {
    const prods = await db
      .select({ id: producto.fotoAssetId })
      .from(producto)
      .where(isNotNull(producto.fotoAssetId));
    const clis = await db
      .select({ id: cliente.fotoAssetId })
      .from(cliente)
      .where(isNotNull(cliente.fotoAssetId));

    targetIds = [
      ...new Set([
        ...prods.map((p) => p.id).filter(Boolean),
        ...clis.map((c) => c.id).filter(Boolean),
      ]),
    ] as string[];
  }

  const query = db
    .select()
    .from(asset)
    .where(
      targetIds
        ? inArray(asset.id, targetIds)
        : inArray(asset.ownerType, ["producto", "cliente"]),
    );

  const rows = await query;
  const imageRows = rows.filter((r) => r.mime.startsWith("image/"));

  console.log(`🔍 Se encontraron ${imageRows.length} assets de imagen a procesar.`);

  let exitosos = 0;
  let omitidos = 0;
  let fallidos = 0;

  for (const row of imageRows) {
    try {
      const original = await storage.get(row.key);
      if (!original) {
        // En base de datos de dev o tras tests, algunos assets huérfanos pueden no estar en R2
        omitidos++;
        continue;
      }

      const variantes: Record<
        string,
        { key: string; width: number; mime: string; size: number }
      > = {};

      for (const def of VARIANTES) {
        const bytes = await sharp(original.bytes)
          .resize(def.width, def.width, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: def.quality })
          .toBuffer();

        const key = `${row.key}-w${def.width}.webp`;
        await storage.put(key, bytes, "image/webp");

        variantes[def.nombre] = {
          key,
          width: def.width,
          mime: "image/webp",
          size: bytes.length,
        };
      }

      await db.update(asset).set({ variantes }).where(eq(asset.id, row.id));

      const tamanos = Object.entries(variantes)
        .map(([nombre, v]) => `${nombre}: ${(v.size / 1024).toFixed(1)} KB`)
        .join(", ");
      console.log(`✅ Asset ${row.id} (${row.ownerType}) -> ${tamanos}`);
      exitosos++;
    } catch (err) {
      console.error(`❌ Error procesando asset ${row.id}:`, err);
      fallidos++;
    }
  }

  console.log("\n✨ Proceso finalizado:");
  console.log(`   - Exitosos (actualizados en R2 y DB): ${exitosos}`);
  console.log(`   - Omitidos (no existían en R2, p. ej. tests antiguos): ${omitidos}`);
  console.log(`   - Fallidos con error: ${fallidos}`);
} finally {
  await client.end();
}
