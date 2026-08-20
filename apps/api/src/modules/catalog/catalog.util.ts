export { esViolacionUnica } from "../shared/pg-error";

export function normalizarHorario(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}
