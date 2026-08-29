import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { asset, organizacion, usuario } from "@misupertostada/db";
import { eq } from "drizzle-orm";
import { AssetsService } from "./assets.service";
import { AssetVariantsJob } from "./variants.job";
import { FakeStorageAdapter } from "./fake.storage";
import { PasswordService } from "../../identity/password.service";
import {
  crearOrgDePrueba,
  openTestDb,
  postgresListo,
} from "../../../test/db";
import type { Actor } from "../../identity/actor";

const listo = await postgresListo();

describe.skipIf(!listo)("AssetsService", () => {
  test("presign + confirm guarda el asset y genera variantes de producto", async () => {
    const { client, db } = openTestDb();
    const storage = new FakeStorageAdapter();
    const variants = new AssetVariantsJob(db, storage);
    const assets = new AssetsService(db, storage, variants);
    const passwords = new PasswordService();
    const png = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: {
          r: Math.floor(Math.random() * 255),
          g: Math.floor(Math.random() * 255),
          b: Math.floor(Math.random() * 255),
        },
      },
    })
      .png()
      .toBuffer();

    const org = await crearOrgDePrueba(db, "org-asset-");
    const [user] = await db
      .insert(usuario)
      .values({
        organizacionId: org!.id,
        username: `foto-${crypto.randomUUID().slice(0, 8)}`,
        passwordHash: await passwords.hash("clave-dev-local-10"),
        rol: "ADMIN_JEFE",
        activo: true,
      })
      .returning({ id: usuario.id });

    const sha256 = createHash("sha256").update(png).digest("hex");
    const ownerId = crypto.randomUUID();
    const actor: Actor = {
      usuarioId: user!.id,
      organizacionId: org!.id,
      username: "foto.test",
      rol: "ADMIN_JEFE",
      permisos: [],
      sesionId: crypto.randomUUID(),
      ip: null,
      userAgent: null,
    };

    try {
      const signed = await assets.presign({
        ownerType: "producto",
        ownerId,
        mime: "image/png",
        size: png.length,
        sha256,
      });
      expect(signed.alreadyUploaded).toBe(false);
      if (!signed.alreadyUploaded) {
        expect(signed.method).toBe("PUT");
        expect(signed.key).toBe(sha256);
      }

      await storage.put(sha256, png, "image/png");
      const saved = await assets.confirm(
        {
          ownerType: "producto",
          ownerId,
          mime: "image/png",
          size: png.length,
          sha256,
        },
        actor,
      );

      expect(saved.key).toBe(sha256);
      const variantes = saved.variantes as {
        thumb?: { key: string };
        card?: { key: string };
      } | null;
      expect(variantes?.thumb?.key).toBe(`${sha256}-w160.webp`);
      expect(variantes?.card?.key).toBe(`${sha256}-w640.webp`);
      expect(await storage.head(`${sha256}-w160.webp`)).not.toBeNull();

      const again = await assets.presign({
        ownerType: "producto",
        ownerId,
        mime: "image/png",
        size: png.length,
        sha256,
      });
      expect(again.alreadyUploaded).toBe(true);

      const [row] = await db.select().from(asset).where(eq(asset.id, saved.id));
      expect(row?.subidoPor).toBe(user!.id);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
