import { etiquetaDiaSemanaCorto } from "./fecha-ui";

/**
 * Copy de los tres ejes de fecha, en un solo sitio.
 *
 * La ventana cruza la medianoche, así que «hoy» son tres días distintos
 * (captura, en curso, día de calendario) y cada pantalla se ancla al que le toca. Antes
 * cada vista redactaba su propia frase —o no redactaba ninguna— y el usuario
 * tenía que deducir el eje del contenido. Aquí vive la redacción de todas,
 * para que /produccion, /reparto, /pedidos y /cartera digan lo mismo igual.
 *
 * Ver `AGENTS.md` §2.3 y `USAGE.md` §4.
 */
export type EjesUi = {
  fechaOperacionCaptura: string;
  fechaOperacionEnCurso: string;
  hoyCivil: string;
  mismaOperacion: boolean;
  ventanaAbierta: boolean;
};

/**
 * Operación que abre una pantalla de operación sin filtro en la URL.
 *
 * Con la ventana abierta el trabajo activo es capturar; con la ventana cerrada
 * es producir, repartir y cobrar lo ya cerrado. Es el espejo en web de
 * `EjesOperacion.fechaFoco` en el servidor: una sola regla para /hoy y
 * /pedidos, en vez de que cada pantalla elija su propio «hoy».
 */
export function fechaFocoUi(
  cal:
    | Pick<
        EjesUi,
        "ventanaAbierta" | "fechaOperacionCaptura" | "fechaOperacionEnCurso"
      >
    | undefined,
): string {
  if (!cal) return "";
  return cal.ventanaAbierta
    ? cal.fechaOperacionCaptura
    : cal.fechaOperacionEnCurso;
}

export type CopyEje = {
  /** Qué se está viendo. Una línea, sin subordinadas. */
  titulo: string;
  /** Por qué ese eje y no otro. Se puede omitir en pantallas apretadas. */
  detalle: string;
};

const dia = etiquetaDiaSemanaCorto;

/**
 * `/produccion` vive en el eje **en curso**: Alex produce de madrugada lo que
 * se reparte hoy. La hoja de la ventana que abre esta tarde no existe hasta
 * que se cierre, así que anclarla al foco hacía que a las 15:01 la pantalla
 * se vaciara con «hoja no materializada».
 */
export function copyEjeProduccion(cal: EjesUi): CopyEje {
  return {
    titulo: `Hoja de la operación ${dia(cal.fechaOperacionEnCurso)}`,
    detalle: cal.mismaOperacion
      ? `Se entrega hoy, ${dia(cal.hoyCivil)}.`
      : `Se entrega hoy, ${dia(cal.hoyCivil)}. Lo que entre esta noche en la ventana de ${dia(cal.fechaOperacionCaptura)} no aparece aquí hasta que se cierre.`,
  };
}

/**
 * `/reparto` vive en el eje de **día de calendario**: la ruta se consulta por `fecha_entrega`,
 * que está congelada en el pedido. Por eso no se mueve a las 15:00, cuando
 * Tony sigue en la calle con la misma carga.
 */
export function copyEjeReparto(cal: EjesUi): CopyEje {
  return {
    titulo: `Ruta de hoy · ${dia(cal.hoyCivil)}`,
    detalle: `Pedidos de la operación ${dia(cal.fechaOperacionEnCurso)}. La ruta no cambia cuando abre la ventana de la tarde.`,
  };
}

/**
 * `/cartera` cobra en el eje de **día de calendario**: `pago.fecha` es el día de calle, no la
 * operación. El cuadre del día usa ese mismo eje; si el resumen usara otro,
 * los dos números del mismo panel se contradirían.
 */
export function copyEjeCartera(cal: EjesUi): CopyEje {
  return {
    titulo: `Cobrado hoy · ${dia(cal.hoyCivil)}`,
    detalle: `Día de calle, no operación: incluye lo que Tony cobró de facturas viejas.`,
  };
}

/** Sobre cuál de los ejes cae un día suelto elegido en la bandeja. */
export type EjeDeFecha = "captura" | "curso" | "otra";

export function ejeDeFecha(fecha: string, cal: EjesUi | undefined): EjeDeFecha {
  if (!cal || !fecha) return "otra";
  if (fecha === cal.fechaOperacionEnCurso) return "curso";
  if (fecha === cal.fechaOperacionCaptura) return "captura";
  return "otra";
}

/**
 * Rótulo del rango de `/pedidos`.
 *
 * Un rango de varios días no es ningún eje: es un informe, y decirlo evita que
 * se lea como «la operación de hoy». Un día suelto sí cae en un eje y la
 * bandeja lo nombra.
 */
export function copyRangoPedidos(
  desde: string,
  hasta: string,
  cal: EjesUi | undefined,
): string {
  if (!desde) return "";
  if (desde !== hasta) {
    return `Rango de operaciones · ${dia(desde)} → ${dia(hasta)}`;
  }
  const eje = ejeDeFecha(desde, cal);
  if (eje === "captura") {
    return `Operación en captura · ${dia(desde)} · la ventana de esta noche`;
  }
  if (eje === "curso") {
    return `Operación en curso · ${dia(desde)} · lo que se reparte hoy`;
  }
  return `Operación ${dia(desde)} · histórico`;
}

/** Campos extra de `CalendarioAhora` que la bandeja de pedidos necesita para copy. */
export type CalendarioEjePedidos = EjesUi & {
  fechaEntregaCaptura: string;
  fechaEntregaEnCurso: string;
  capturaAbierta: boolean;
  diaEstado: "SIN_CIERRE" | "CERRADO" | "REABIERTO";
};

/**
 * `/pedidos` vive en el eje **foco**: captura con la ventana abierta, en curso
 * cuando cerró. La bandeja puede además mirar un rango o el historial de un
 * cliente; el copy dice qué está viendo y a qué operación iría un pedido nuevo.
 */
export function copyEjePedidos(
  desde: string,
  hasta: string,
  cal: CalendarioEjePedidos | undefined,
  opts?: { historialCliente?: boolean },
): CopyEje | null {
  if (opts?.historialCliente) {
    return {
      titulo: "Historial del cliente",
      detalle:
        "Todos los pedidos de este restaurante, sin filtro de fecha. Elija «Día» para volver a la bandeja de hoy.",
    };
  }
  if (!desde) return null;
  if (desde !== hasta) {
    return {
      titulo: `Rango de operaciones · ${dia(desde)} → ${dia(hasta)}`,
      detalle:
        "Varias noches a la vez. Un solo día distingue captura, reparto en curso o histórico.",
    };
  }

  const eje = ejeDeFecha(desde, cal);
  if (eje === "captura" && cal) {
    const ventana = cal.capturaAbierta
      ? "Ventana abierta: portal y llamadas entran aquí."
      : cal.diaEstado === "REABIERTO"
        ? "Día reabierto: puede seguir capturando fuera de horario."
        : "Ventana cerrada. Solo correcciones si el día está reabierto.";
    return {
      titulo: `Operación en captura · ${dia(desde)}`,
      detalle: `Entrega ${dia(cal.fechaEntregaCaptura)}. ${ventana}`,
    };
  }
  if (eje === "curso" && cal) {
    const capturaParalela =
      !cal.mismaOperacion && cal.ventanaAbierta
        ? ` La captura vive en ${dia(cal.fechaOperacionCaptura)}.`
        : "";
    return {
      titulo: `Operación en curso · ${dia(desde)}`,
      detalle: `Entrega ${dia(cal.fechaEntregaEnCurso)}. Lo que ya se cerró y sale a reparto.${capturaParalela}`,
    };
  }
  return {
    titulo: `Operación ${dia(desde)}`,
    detalle: "Histórico: ya se repartió y cerró. Sirve para consultar o anular.",
  };
}
