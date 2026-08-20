window.MST_DATA = {
  fechaOperacion: 'jueves 20 de agosto',
  ventanaRestanteMs: 2 * 3600e3 + 14 * 60e3,
  usuario: { nombre: 'Cristian', rol: 'ADMIN_JEFE' },
  clientes: [
    { id: 'c1', nombre: 'Restaurante Doña Marta', contacto: 'Marta Xocop', tel: '5012 8834', entrega: '08:30', pendientes: 3, limite: 4, saldoCentavos: 186500 },
    { id: 'c2', nombre: 'Comedor Los Tabascos', contacto: 'Julio Tabasco', tel: '4477 1290', entrega: '07:00', pendientes: 5, limite: 4, saldoCentavos: 412000, nota: 'grosor especial en tortilla' },
    { id: 'c3', nombre: 'Cafetería El Portal', contacto: 'Ana Lux', tel: '3055 7712', entrega: '09:15', pendientes: 1, limite: 6, saldoCentavos: 52000 },
    { id: 'c4', nombre: 'Pollo Brasero Zona 3', contacto: 'Don Chepe', tel: '5588 4410', entrega: '10:00', pendientes: 0, limite: 4, saldoCentavos: 0 },
  ],
  pedidos: [
    { correlativo: 1042, clienteId: 'c1', estado: 'CONFIRMADO', origen: 'PORTAL', hora: '21:04', totalCentavos: 124050, items: [
      { nombreMostrado: 'Tortilla n.º 16', alias: 'tortilla grande', unidadMedida: 'LIBRA', cantidad: 40, precioUnitarioCentavos: 450, puntoCarga: 'PLANTA' },
      { nombreMostrado: 'Tostada delgada', alias: 'tostada fina', unidadMedida: 'BOLSA', cantidad: 12, precioUnitarioCentavos: 1200, puntoCarga: 'PLANTA' },
      { nombreMostrado: 'Papalinas', unidadMedida: 'BOLSA', cantidad: 6, precioUnitarioCentavos: 1500, puntoCarga: 'DEMOCRACIA' },
    ] },
    { correlativo: 1043, clienteId: 'c2', estado: 'CONFIRMADO', origen: 'PORTAL', hora: '21:22', totalCentavos: 268000, items: [
      { nombreMostrado: 'Tortilla n.º 14', alias: 'tortilla mediana', unidadMedida: 'LIBRA', cantidad: 60, precioUnitarioCentavos: 430, puntoCarga: 'PLANTA', notaProduccion: 'grosor especial' },
      { nombreMostrado: 'Chicharrón de harina', unidadMedida: 'BOLSA', cantidad: 8, precioUnitarioCentavos: 1250, puntoCarga: 'DEMOCRACIA' },
    ] },
    { correlativo: 1044, clienteId: 'c3', estado: 'BORRADOR', origen: 'MANUAL', hora: '21:38', totalCentavos: 63000, items: [
      { nombreMostrado: 'Tortilla n.º 16', alias: 'tortilla grande', unidadMedida: 'LIBRA', cantidad: 14, precioUnitarioCentavos: 450, puntoCarga: 'PLANTA' },
    ] },
  ],
  facturas: [
    { numeroDte: 'A-00918273', correlativo: 1038, clienteId: 'c1', montoCentavos: 98500, pagadoCentavos: 0, estado: 'PENDIENTE', emitida: '18 ago' },
    { numeroDte: 'A-00918241', correlativo: 1031, clienteId: 'c1', montoCentavos: 88000, pagadoCentavos: 40000, estado: 'ABONO_PARCIAL', emitida: '15 ago' },
    { numeroDte: 'A-00918102', correlativo: 1019, clienteId: 'c2', montoCentavos: 156000, pagadoCentavos: 0, estado: 'VENCIDO', emitida: '02 ago' },
    { numeroDte: 'A-00918155', correlativo: 1024, clienteId: 'c2', montoCentavos: 256000, pagadoCentavos: 0, estado: 'PENDIENTE', emitida: '09 ago' },
    { numeroDte: 'A-00918290', correlativo: 1040, clienteId: 'c3', montoCentavos: 52000, pagadoCentavos: 0, estado: 'PENDIENTE', emitida: '19 ago' },
    { numeroDte: 'A-00918268', correlativo: 1036, clienteId: 'c4', montoCentavos: 74000, pagadoCentavos: 74000, estado: 'PAGADO', emitida: '17 ago' },
  ],
  hoja: [
    { punto: 'PLANTA', producto: 'Tortilla n.º 16', unidad: 'lb', cantidad: 54, nuevo: false },
    { punto: 'PLANTA', producto: 'Tortilla n.º 14', unidad: 'lb', cantidad: 60, nota: 'grosor especial · Tabascos', nuevo: true },
    { punto: 'PLANTA', producto: 'Tostada delgada', unidad: 'bolsas', cantidad: 12, nuevo: false },
    { punto: 'DEMOCRACIA', producto: 'Papalinas', unidad: 'bolsas', cantidad: 6, nuevo: false },
    { punto: 'DEMOCRACIA', producto: 'Chicharrón de harina', unidad: 'bolsas', cantidad: 8, nuevo: true },
  ],
  conversaciones: [
    { id: 'v1', clienteId: 'c1', ultimo: 'Mañana igual que ayer, gracias', hora: '21:02', noLeidos: 0, ventanaMs: 21 * 3600e3 + 5 * 60e3 },
    { id: 'v2', clienteId: 'c2', ultimo: '¿Ya salió mi pedido?', hora: '20:48', noLeidos: 2, ventanaMs: 19 * 3600e3 },
    { id: 'v3', clienteId: 'c4', ultimo: 'Estado de cuenta enviado', hora: 'ayer', noLeidos: 0, ventanaMs: 0 },
  ],
  catalogo: [
    { sku: 'TOR-16-LB', nombre: 'Tortilla n.º 16', familia: 'Tortilla', unidad: 'LIBRA', punto: 'PLANTA', precioCentavos: 450, alias: 'tortilla grande' },
    { sku: 'TOR-14-LB', nombre: 'Tortilla n.º 14', familia: 'Tortilla', unidad: 'LIBRA', punto: 'PLANTA', precioCentavos: 430, alias: 'tortilla mediana' },
    { sku: 'TOS-DEL-BO', nombre: 'Tostada delgada', familia: 'Tostada', unidad: 'BOLSA', punto: 'PLANTA', precioCentavos: 1200, alias: 'tostada fina' },
    { sku: 'PAP-NAT-BO', nombre: 'Papalinas', familia: 'Fritura', unidad: 'BOLSA', punto: 'DEMOCRACIA', precioCentavos: 1500 },
    { sku: 'CHI-HAR-BO', nombre: 'Chicharrón de harina', familia: 'Fritura', unidad: 'BOLSA', punto: 'DEMOCRACIA', precioCentavos: 1250 },
  ],
};
