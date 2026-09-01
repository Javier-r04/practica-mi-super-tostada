import { envelopeSchema } from "@misupertostada/shared";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    if (!res.ok) {
      throw new ApiError("HTTP", "No se pudo descargar", res.status);
    }
    return (await res.text()) as T;
  }
  if (contentType.includes("application/pdf")) {
    if (!res.ok) {
      throw new ApiError("HTTP", "No se pudo descargar el PDF", res.status);
    }
    return (await res.blob()) as T;
  }
  const json: unknown = await res.json();
  const parsed = envelopeSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("HTTP", "Respuesta inválida", res.status);
  }
  if (!parsed.data.success || parsed.data.error) {
    throw new ApiError(
      parsed.data.error?.code ?? "HTTP",
      parsed.data.error?.message ?? "Error",
      res.status,
    );
  }
  return parsed.data.data as T;
}

export async function apiVoid(path: string, init?: RequestInit): Promise<void> {
  await api(path, init);
}
