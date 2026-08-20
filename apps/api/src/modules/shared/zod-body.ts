import { z } from "zod";
import { DomainException } from "./domain.exception";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DomainException(
      "VALIDACION",
      issue ? `${issue.path.join(".")}: ${issue.message}` : "Cuerpo inválido",
      400,
    );
  }
  return parsed.data;
}
