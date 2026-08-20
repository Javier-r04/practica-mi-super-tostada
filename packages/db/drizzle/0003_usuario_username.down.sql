ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "usuario_username_unique";
ALTER TABLE "usuario" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_email_unique" UNIQUE ("email");
ALTER TABLE "usuario" DROP COLUMN IF EXISTS "username";
