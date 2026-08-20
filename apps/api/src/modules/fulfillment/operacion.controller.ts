import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { DomainException } from "../shared/domain.exception";
import { CierreService } from "./cierre.service";
import { HojaService } from "./hoja.service";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function parseFecha(raw: string): {
  fecha: string;
  formato: "json" | "txt" | "pdf";
} {
  let formato: "json" | "txt" | "pdf" = "json";
  let fecha = raw;
  if (raw.endsWith(".txt")) {
    formato = "txt";
    fecha = raw.slice(0, -4);
  } else if (raw.endsWith(".pdf")) {
    formato = "pdf";
    fecha = raw.slice(0, -4);
  }
  if (!FECHA.test(fecha)) {
    throw new DomainException("VALIDACION", "Use AAAA-MM-DD", 400);
  }
  return { fecha, formato };
}

@Controller("operacion")
export class OperacionController {
  constructor(private readonly cierre: CierreService) {}

  @Get()
  async resumen(
    @Query("fechaOperacion") fechaOperacion: string | undefined,
    @CurrentActor() actor: Actor,
  ) {
    const fecha =
      fechaOperacion && fechaOperacion.length > 0
        ? parseFecha(fechaOperacion).fecha
        : undefined;
    return envelopeOk(await this.cierre.resumen(actor, fecha));
  }

  @Post("cerrar")
  @RequierePermiso("ventana.cerrar")
  async cerrar(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.cierre.cerrar(body ?? {}, actor));
  }

  @Post("reabrir")
  @RequierePermiso("ventana.reabrir")
  async reabrir(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.cierre.reabrir(body, actor));
  }
}

@Controller("hojas")
export class HojasController {
  constructor(private readonly hojas: HojaService) {}

  @Get(":fechaRaw")
  async obtener(
    @Param("fechaRaw") fechaRaw: string,
    @CurrentActor() actor: Actor,
  ) {
    const { fecha, formato } = parseFecha(fechaRaw);
    if (formato === "txt") {
      const texto = await this.hojas.textoPlano(actor.organizacionId, fecha);
      return new StreamableFile(Buffer.from(texto, "utf8"), {
        type: "text/plain; charset=utf-8",
        disposition: `attachment; filename="hoja-${fecha}.txt"`,
      });
    }
    if (formato === "pdf") {
      const pdf = await this.hojas.pdf(actor.organizacionId, fecha);
      return new StreamableFile(pdf, {
        type: "application/pdf",
        disposition: `attachment; filename="hoja-${fecha}.pdf"`,
      });
    }
    return envelopeOk(await this.hojas.obtener(actor.organizacionId, fecha));
  }
}
