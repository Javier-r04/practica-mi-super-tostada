import { etiquetaDiaSemanaCorto } from "./fecha-ui";

/**
 * Copy del día **reabierto y sin volver a cerrar**, en un solo sitio.
 *
 * Reabrir un día lo saca del cierre: no hay hoja materializada y los pedidos
 * se quedan en CONFIRMADO. El cron no lo vuelve a cerrar a propósito —alguien
 * lo está corrigiendo a mano y cerrarlo por debajo le borraría el trabajo—,
 * así que el único que puede avisar es el panel. Sin este aviso, producción y
 * reparto salen en blanco el día del reparto sin decir por qué, que es
 * exactamente lo que pasó con la operación del 22 de agosto de 2026.
 *
 * Ver `CierreService.cerrarSiToca` y `AGENTS.md` §2.3.
 */
export type EstadoDiaUi = "SIN_CIERRE" | "CERRADO" | "REABIERTO";

export type ReaperturaUi = {
  fechaOperacionCaptura: string;
  fechaOperacionEnCurso: string;
  diaEstado: EstadoDiaUi;
  diaEstadoEnCurso: EstadoDiaUi;
};

export type AvisoReabierto = {
  /** Operación reabierta. Es la fecha que hay que pasar a «cerrar día». */
  fechaOperacion: string;
  /** Chip del navbar. Corto: compite con los tres ejes y la ventana. */
  chip: string;
  /** Frase del vacío de producción y reparto. Dice qué hacer, no solo qué pasa. */
  detalle: string;
  /**
   * `true` cuando la reabierta es la operación que se reparte hoy: ahí no es
   * un aviso, es la causa de que las pantallas estén vacías.
   */
  bloqueaOperacion: boolean;
};

const dia = etiquetaDiaSemanaCorto;

/**
 * Aviso a mostrar, o `null` si no hay ninguna operación reabierta.
 *
 * Si las dos están reabiertas gana la **en curso**: es la que tiene el reparto
 * detenido hoy, mientras que la de captura todavía tiene toda la ventana por
 * delante para volver a cerrarse.
 */
export function avisoReabierto(
  cal: ReaperturaUi | undefined,
): AvisoReabierto | null {
  if (!cal) return null;

  if (cal.diaEstadoEnCurso === "REABIERTO") {
    return {
      fechaOperacion: cal.fechaOperacionEnCurso,
      chip: `Operación ${dia(cal.fechaOperacionEnCurso)} reabierta`,
      detalle: `La operación ${dia(cal.fechaOperacionEnCurso)} se reabrió y no se ha vuelto a cerrar. Hasta que se cierre no hay hoja de producción y los pedidos no salen a la ruta.`,
      bloqueaOperacion: true,
    };
  }

  if (cal.diaEstado === "REABIERTO") {
    return {
      fechaOperacion: cal.fechaOperacionCaptura,
      chip: `Captura ${dia(cal.fechaOperacionCaptura)} reabierta`,
      detalle: `La operación ${dia(cal.fechaOperacionCaptura)} está reabierta: se puede seguir capturando fuera de horario. Ciérrala cuando termines la corrección.`,
      bloqueaOperacion: false,
    };
  }

  return null;
}
