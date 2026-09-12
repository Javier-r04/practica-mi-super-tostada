import { Module } from "@nestjs/common";
import { ProductosService } from "./productos.service";
import { ProductosController } from "./productos.controller";
import { ClientesService } from "./clientes.service";
import { ClientesController } from "./clientes.controller";
import { ClienteProductoService } from "./cliente-producto.service";
import { ClienteBonoService } from "./cliente-bono.service";
import { ImportService } from "./import.service";
import { ImportController } from "./import.controller";

@Module({
  controllers: [ProductosController, ClientesController, ImportController],
  providers: [
    ProductosService,
    ClientesService,
    ClienteProductoService,
    ClienteBonoService,
    ImportService,
  ],
  exports: [ClienteBonoService],
})
export class CatalogModule {}
