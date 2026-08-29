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

  /**
   * El reporte del recorte actual. La ruta conserva el nombre histórico
   * `quincena.pdf`, pero el documento y el archivo siguen al periodo elegido.
   * El nombre sale del rango ya resuelto y saneado, nunca del query crudo:
   * la cabecera `Content-Disposition` no puede llevar texto del cliente.
   */
  @Get("quincena.pdf")
  async pdf(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    const { buffer, nombreArchivo } = await this.tablero.exportarPdf(
      actor,
      query,
    );
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `attachment; filename="${nombreArchivo}"`,
    });
  }
}
