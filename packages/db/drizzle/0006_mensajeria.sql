-- Mensajería: unique de conversación, token de portal cifrado, WABA y mapa de propósito.
-- Nada se borra.

ALTER TABLE cliente ADD COLUMN token_portal_cifrado text;

CREATE UNIQUE INDEX conversacion_cliente_id_unique
  ON conversacion (cliente_id);

CREATE TABLE "conexion_waba" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organizacion_id" uuid NOT NULL REFERENCES "organizacion"("id"),
  "waba_id" text,
  "phone_number_id" text,
  "access_token_cifrado" text,
  "wa_produccion" text,
  "wa_tienda" text,
  "estado" text DEFAULT 'DESARROLLO' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX conexion_waba_org_unique
  ON conexion_waba (organizacion_id);

CREATE TABLE "plantilla_proposito" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organizacion_id" uuid NOT NULL REFERENCES "organizacion"("id"),
  "proposito" text NOT NULL,
  "plantilla_wa_id" uuid NOT NULL REFERENCES "plantilla_wa"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX plantilla_proposito_org_proposito_unique
  ON plantilla_proposito (organizacion_id, proposito);

INSERT INTO "permiso" ("codigo", "descripcion")
VALUES
  ('mensajeria.enviar', 'Enviar WhatsApp y mapear plantillas'),
  ('mensajeria.conectar', 'Conectar el WABA con Embedded Signup')
ON CONFLICT ("codigo") DO NOTHING;
