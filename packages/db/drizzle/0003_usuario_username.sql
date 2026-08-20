-- Login interno por username, no por correo.
-- Backfill: parte local del email existente (datos de seed/test).

ALTER TABLE "usuario" ADD COLUMN "username" text;

UPDATE "usuario"
SET "username" = lower(split_part("email", '@', 1))
WHERE "username" IS NULL AND "email" IS NOT NULL;

UPDATE "usuario"
SET "username" = 'u-' || replace(id::text, '-', '')
WHERE "username" IS NULL OR "username" = '';

ALTER TABLE "usuario" ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "usuario" ADD CONSTRAINT "usuario_username_unique" UNIQUE ("username");

ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "usuario_email_unique";

ALTER TABLE "usuario" ALTER COLUMN "email" DROP NOT NULL;
