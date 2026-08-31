import { describe, expect, test } from "bun:test";
import {
  copyEjeCartera,
  copyEjePedidos,
  copyEjeProduccion,
  copyEjeReparto,
  copyRangoPedidos,
  ejeDeFecha,
  type EjesUi,
} from "./ejes-vista";

// Martes 15:30: la ventana del martes abre mientras se reparte lo del lunes.
const SEPARADOS: EjesUi = {
  fechaOperacionCaptura: "2026-08-25",
  fechaOperacionEnCurso: "2026-08-24",
  hoyCivil: "2026-08-25",
  mismaOperacion: false,
  ventanaAbierta: true,
};

// Martes 08:00: ventana cerrada, captura y reparto son la misma operación.
const JUNTOS: EjesUi = {
  fechaOperacionCaptura: "2026-08-24",
  fechaOperacionEnCurso: "2026-08-24",
  hoyCivil: "2026-08-25",
  mismaOperacion: true,
  ventanaAbierta: false,
};

describe("copyEjeProduccion", () => {
  test("se ancla a la operación en curso, no a la que se captura", () => {
    const copy = copyEjeProduccion(SEPARADOS);
    expect(copy.titulo).toContain("Lu 24 ago");
    expect(copy.titulo).not.toContain("25 ago");
  });

  test("avisa que la ventana abierta no entra en esta hoja", () => {
    expect(copyEjeProduccion(SEPARADOS).detalle).toContain("Ma 25 ago");
    expect(copyEjeProduccion(JUNTOS).detalle).not.toContain("ventana");
  });
});

describe("copyEjeReparto", () => {
  test("titula por día de calendario y nombra la operación de origen", () => {
    const copy = copyEjeReparto(SEPARADOS);
    expect(copy.titulo).toContain("Ma 25 ago");
    expect(copy.detalle).toContain("Lu 24 ago");
  });
});

describe("copyEjeCartera", () => {
  test("el cobro es del día de calendario aunque la operación sea otra", () => {
    expect(copyEjeCartera(SEPARADOS).titulo).toContain("Ma 25 ago");
  });
});

describe("ejeDeFecha", () => {
  test("clasifica captura, curso e histórico", () => {
    expect(ejeDeFecha("2026-08-25", SEPARADOS)).toBe("captura");
    expect(ejeDeFecha("2026-08-24", SEPARADOS)).toBe("curso");
    expect(ejeDeFecha("2026-08-01", SEPARADOS)).toBe("otra");
  });

  test("en curso gana cuando los dos ejes coinciden", () => {
    expect(ejeDeFecha("2026-08-24", JUNTOS)).toBe("curso");
  });

  test("sin calendario no inventa un eje", () => {
    expect(ejeDeFecha("2026-08-24", undefined)).toBe("otra");
  });
});

describe("copyRangoPedidos", () => {
  test("un rango de varios días no es ningún eje", () => {
    const copy = copyRangoPedidos("2026-08-17", "2026-08-23", SEPARADOS);
    expect(copy).toBe("Rango de operaciones · Lu 17 ago → Do 23 ago");
  });

  test("un día suelto se nombra por su eje", () => {
    expect(copyRangoPedidos("2026-08-25", "2026-08-25", SEPARADOS)).toContain(
      "Operación en captura",
    );
    expect(copyRangoPedidos("2026-08-24", "2026-08-24", SEPARADOS)).toContain(
      "Operación en curso",
    );
    expect(copyRangoPedidos("2026-08-03", "2026-08-03", SEPARADOS)).toContain(
      "histórico",
    );
  });

  test("sin fecha no rotula nada", () => {
    expect(copyRangoPedidos("", "", SEPARADOS)).toBe("");
  });
});

const CAL_PEDIDOS = {
  ...SEPARADOS,
  fechaEntregaCaptura: "2026-08-26",
  fechaEntregaEnCurso: "2026-08-25",
  capturaAbierta: true,
  diaEstado: "SIN_CIERRE" as const,
};

describe("copyEjePedidos", () => {
  test("un día en captura nombra entrega y ventana", () => {
    const copy = copyEjePedidos("2026-08-25", "2026-08-25", CAL_PEDIDOS);
    expect(copy?.titulo).toContain("captura");
    expect(copy?.detalle).toContain("Mi 26 ago");
    expect(copy?.detalle).toContain("Ventana abierta");
  });

  test("un día en curso avisa si la captura vive en otra operación", () => {
    const copy = copyEjePedidos("2026-08-24", "2026-08-24", CAL_PEDIDOS);
    expect(copy?.titulo).toContain("curso");
    expect(copy?.detalle).toContain("Ma 25 ago");
  });

  test("rango e historial de cliente tienen copy propio", () => {
    expect(
      copyEjePedidos("2026-08-17", "2026-08-23", CAL_PEDIDOS)?.titulo,
    ).toContain("Rango");
    expect(
      copyEjePedidos("", "", CAL_PEDIDOS, { historialCliente: true })?.titulo,
    ).toBe("Historial del cliente");
  });
});
