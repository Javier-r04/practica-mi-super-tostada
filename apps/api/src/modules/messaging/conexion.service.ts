import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { conexionWaba } from "@misupertostada/db";
import {
  conexionWabaPublicaSchema,
  tienePermiso,
  type Clock,
  type ConexionWabaPublica,
} from "@misupertostada/shared";
import { loadEnv, metaSignupConfigured } from "../../config/env";
import { CLOCK, DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { DomainException } from "../shared/domain.exception";
import { EncryptionService } from "../shared/crypto";
import type { Actor } from "../identity/actor";
import { WHATSAPP_PORT, type WhatsAppPort } from "./whatsapp.port";
import { PlantillaService } from "./plantilla.service";

@Injectable()
export class ConexionWabaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(WHATSAPP_PORT) private readonly wa: WhatsAppPort,
    private readonly crypto: EncryptionService,
    private readonly plantillas: PlantillaService,
  ) {}

  async estado(actor: Actor): Promise<ConexionWabaPublica> {
    const env = loadEnv();
    const [row] = await this.db
      .select()
      .from(conexionWaba)
      .where(eq(conexionWaba.organizacionId, actor.organizacionId))
      .limit(1);
    const modoDesarrollo = !row || row.estado === "DESARROLLO" || !env.META_APP_ID;
    return conexionWabaPublicaSchema.parse({
      estado: row?.estado ?? "DESARROLLO",
      modoDesarrollo,
      puedeConectarMeta: metaSignupConfigured(env),
      wabaId: row?.wabaId ?? null,
      waProduccion: row?.waProduccion ?? null,
      waTienda: row?.waTienda ?? null,
    });
  }

  async callback(body: unknown, actor: Actor): Promise<ConexionWabaPublica> {
    if (!tienePermiso(actor.permisos, "mensajeria.conectar")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const env = loadEnv();
    if (!metaSignupConfigured(env)) {
      await this.plantillas.ensureFakeSeed(actor.organizacionId, this.clock.now());
      await this.db
        .insert(conexionWaba)
        .values({
          organizacionId: actor.organizacionId,
          estado: "DESARROLLO",
        })
        .onConflictDoNothing();
      return this.estado(actor);
    }
    const code =
      body && typeof body === "object" && "code" in body
        ? String((body as { code: unknown }).code)
        : "";
    if (!code) {
      throw new DomainException("VALIDACION", "Falta el code de Embedded Signup", 400);
    }
    throw new DomainException(
      "NO_DISPONIBLE",
      "El intercambio OAuth de Meta se activa cuando la app esté verificada",
      409,
    );
  }

  async syncPlantillas(actor: Actor): Promise<void> {
    if (!tienePermiso(actor.permisos, "mensajeria.conectar")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const env = loadEnv();
    const [row] = await this.db
      .select()
      .from(conexionWaba)
      .where(eq(conexionWaba.organizacionId, actor.organizacionId))
      .limit(1);
    if (!row?.wabaId || !row.accessTokenCifrado || !env.META_APP_ID) {
      await this.plantillas.ensureFakeSeed(actor.organizacionId, this.clock.now());
      return;
    }
    const token = this.crypto.decrypt(row.accessTokenCifrado);
    if (!token) {
      throw new DomainException("VALIDACION", "No se pudo descifrar el token de WABA", 409);
    }
    const items = await this.wa.syncTemplates({ wabaId: row.wabaId, accessToken: token });
    await this.plantillas.upsertDesdeGraph(
      actor.organizacionId,
      items,
      this.clock.now(),
    );
  }
}
