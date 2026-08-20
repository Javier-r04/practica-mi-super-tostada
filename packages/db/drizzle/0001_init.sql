CREATE TYPE "public"."familia" AS ENUM('TORTILLA', 'TOSTADA', 'FRITURA');--> statement-breakpoint
CREATE TYPE "public"."mensaje_direccion" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."outbox_estado" AS ENUM('PENDIENTE', 'ENVIADO', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."pago_metodo" AS ENUM('EFECTIVO', 'TRANSFERENCIA');--> statement-breakpoint
CREATE TYPE "public"."pedido_estado" AS ENUM('BORRADOR', 'CONFIRMADO', 'EN_PRODUCCION', 'ENTREGADO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."pedido_origen" AS ENUM('PORTAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."punto_carga" AS ENUM('PLANTA', 'DEMOCRACIA');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('ADMIN_JEFE', 'ADMIN', 'PRODUCCION', 'TIENDA', 'REPARTO');--> statement-breakpoint
CREATE TYPE "public"."unidad_medida" AS ENUM('LIBRA', 'BOLSA', 'UNIDAD');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"bucket" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"variantes" jsonb,
	"subido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_tipo" text NOT NULL,
	"actor_id" text NOT NULL,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"antes" jsonb,
	"despues" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"contacto" text,
	"telefono_wa" text,
	"horario_entrega_fijo" time,
	"notas_permanentes" text,
	"limite_facturas_pendientes" integer,
	"token_portal_hash" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cliente_org_nombre_unique" UNIQUE("organizacion_id","nombre"),
	CONSTRAINT "cliente_token_portal_hash_unique" UNIQUE("token_portal_hash")
);
--> statement-breakpoint
CREATE TABLE "cliente_producto" (
	"cliente_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"alias" text,
	"precio_centavos" integer,
	"nota_produccion" text,
	"favorito" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cliente_producto_pk" UNIQUE("cliente_id","producto_id")
);
--> statement-breakpoint
CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"ventana_expira_at" timestamp with time zone,
	"ultimo_inbound_at" timestamp with time zone,
	"no_leidos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dia_no_laborable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"motivo" text NOT NULL,
	"editable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "dia_no_laborable_org_fecha_unique" UNIQUE("organizacion_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"payload" jsonb NOT NULL,
	"ocurrido_at" timestamp with time zone DEFAULT now() NOT NULL,
	"procesado_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "factura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"numero_dte" text,
	"monto_centavos" integer NOT NULL,
	"emitida_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factura_pedido_unique" UNIQUE("pedido_id")
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"wa_message_id" text,
	"direction" "mensaje_direccion" NOT NULL,
	"tipo" text NOT NULL,
	"template_name" text,
	"params" jsonb,
	"body_renderizado" text,
	"status" text,
	"error_code" text,
	"enviado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mensaje_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
CREATE TABLE "organizacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"ventana_apertura" time DEFAULT '15:00' NOT NULL,
	"ventana_cierre" time DEFAULT '00:00' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"destinatario_id" uuid NOT NULL,
	"fecha_operacion" date NOT NULL,
	"payload" jsonb NOT NULL,
	"estado" "outbox_estado" DEFAULT 'PENDIENTE' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factura_id" uuid NOT NULL,
	"monto_centavos" integer NOT NULL,
	"metodo" "pago_metodo" NOT NULL,
	"fecha" date NOT NULL,
	"comprobante_asset_id" uuid,
	"registrado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"correlativo" integer NOT NULL,
	"fecha_operacion" date NOT NULL,
	"cliente_id" uuid NOT NULL,
	"estado" "pedido_estado" DEFAULT 'BORRADOR' NOT NULL,
	"origen" "pedido_origen" NOT NULL,
	"notas_admin" text,
	"capturado_por" uuid,
	"anulado_at" timestamp with time zone,
	"motivo_anulacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedido_org_correlativo_unique" UNIQUE("organizacion_id","correlativo")
);
--> statement-breakpoint
CREATE TABLE "pedido_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad_pedida" integer NOT NULL,
	"cantidad_entregada" integer NOT NULL,
	"precio_unitario_centavos" integer NOT NULL,
	"nombre_mostrado" text NOT NULL,
	"unidad_medida" "unidad_medida" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permiso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	CONSTRAINT "permiso_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "plantilla_wa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"language" text NOT NULL,
	"status" text NOT NULL,
	"componentes" jsonb,
	"sincronizado_at" timestamp with time zone,
	CONSTRAINT "plantilla_wa_org_name_lang_unique" UNIQUE("organizacion_id","name","language")
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"nombre_canonico" text NOT NULL,
	"familia" "familia" NOT NULL,
	"unidad_medida" "unidad_medida" NOT NULL,
	"punto_carga" "punto_carga" NOT NULL,
	"es_producido" boolean DEFAULT true NOT NULL,
	"foto_asset_id" uuid,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producto_org_sku_unique" UNIQUE("organizacion_id","sku")
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesion_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"rol" "rol" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "usuario_permiso" (
	"usuario_id" uuid NOT NULL,
	"permiso_id" uuid NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_permiso_pk" UNIQUE("usuario_id","permiso_id")
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_subido_por_usuario_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_producto" ADD CONSTRAINT "cliente_producto_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_producto" ADD CONSTRAINT "cliente_producto_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dia_no_laborable" ADD CONSTRAINT "dia_no_laborable_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factura" ADD CONSTRAINT "factura_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_enviado_por_usuario_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_factura_id_factura_id_fk" FOREIGN KEY ("factura_id") REFERENCES "public"."factura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_capturado_por_usuario_id_fk" FOREIGN KEY ("capturado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_wa" ADD CONSTRAINT "plantilla_wa_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "producto_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_permiso" ADD CONSTRAINT "usuario_permiso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_permiso" ADD CONSTRAINT "usuario_permiso_permiso_id_permiso_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permiso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_permiso" ADD CONSTRAINT "usuario_permiso_granted_by_usuario_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entidad_idx" ON "audit_log" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotencia_unique" ON "outbox" USING btree ("tipo","destinatario_id","fecha_operacion");--> statement-breakpoint
CREATE INDEX "pedido_fecha_operacion_idx" ON "pedido" USING btree ("fecha_operacion");