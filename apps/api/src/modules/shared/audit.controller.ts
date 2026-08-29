import { Controller, Get, Query } from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { AuditReader } from "./audit.reader";

@Controller("audit")
export class AuditController {
  constructor(private readonly reader: AuditReader) {}

  @Get()
  @RequierePermiso("audit.leer")
  async listar(@Query() query: Record<string, string | undefined>) {
    return envelopeOk(await this.reader.listar(query));
  }
}
