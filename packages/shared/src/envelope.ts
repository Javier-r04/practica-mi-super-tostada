import { z } from "zod";

export const envelopeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const envelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().nullable(),
  error: envelopeErrorSchema.nullable(),
});

export type Envelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

export function envelopeOk<T>(data: T): Envelope<T> {
  return { success: true, data, error: null };
}

export function envelopeFail(
  code: string,
  message: string,
): Envelope<null> {
  return { success: false, data: null, error: { code, message } };
}
