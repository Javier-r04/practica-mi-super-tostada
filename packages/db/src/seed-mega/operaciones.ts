import {
  fechaDeInstante,
  type BusinessCalendar,
} from "@misupertostada/shared";

/** Cómo repartir pedidos «vivos» según el reloj de negocio al correr el seed. */
export type MegaSeedOperaciones = {
  fechaCaptura: string;
  fechaEnCurso: string;
  ventanaAbierta: boolean;
  mismaOperacion: boolean;
  /** Día con ventana viva: solo CONFIRMADO / BORRADOR, sin cierre ni hoja. */
  diasCaptura: string[];
  /** Día en producción/reparto: EN_PRODUCCION / ENTREGADO + cierre + hoja. */
  diasProduccionCerrados: string[];
};

/**
 * Alinea el mega-seed con los tres ejes de `BusinessCalendarService.ejes`:
 * captura (ventana viva) vs en curso (lo que Tony reparte hoy).
 *
 * Antes se cerraba siempre `getFechaOperacion(now)` aunque la ventana siguiera
 * abierta — el panel mostraba «día cerrado» y había que reabrir a mano.
 */
export function resolverOperacionesMegaSeed(
  cal: BusinessCalendar,
  now: Date,
): MegaSeedOperaciones {
  const ventanaAbierta = cal.isVentanaAbierta(now);
  const hoyCivil = fechaDeInstante(now);
  const fechaCaptura = cal.getFechaOperacion(now);
  const fechaEnCurso = cal.getOperacionQueEntregaEn(hoyCivil);
  const mismaOperacion = fechaCaptura === fechaEnCurso;

  const diasCaptura: string[] = [];
  const diasProduccionCerrados: string[] = [];

  if (ventanaAbierta) {
    diasCaptura.push(fechaCaptura);
    if (!mismaOperacion) {
      diasProduccionCerrados.push(fechaEnCurso);
    }
  } else {
    diasProduccionCerrados.push(fechaEnCurso);
  }

  return {
    fechaCaptura,
    fechaEnCurso,
    ventanaAbierta,
    mismaOperacion,
    diasCaptura,
    diasProduccionCerrados,
  };
}
