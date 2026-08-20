import { Controller, Get, Query, StreamableFile } from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { TableroService } from "./tablero.service";

@Controller("tablero")
export class AnalyticsController {
  constructor(private readonly tablero: TableroService) {}

  @Get()
  async consultar(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.tablero.consultar(actor, query));
  }

  @Get("quincena.pdf")
  async pdf(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    const buf = await this.tablero.exportarPdf(actor, query);
    const desde = query.desde ?? "periodo";
    const hasta = query.hasta ?? "actual";
    return new StreamableFile(buf, {
      type: "application/pdf",
      disposition: `attachment; filename="cierre-quincena-${desde}-${hasta}.pdf"`,
    });
  }
}
