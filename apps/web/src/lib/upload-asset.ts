import {
  ASSET_MIME_PERMITIDOS,
  type AssetOwnerType,
} from "@misupertostada/shared";
import { api } from "@/lib/api";

type PresignOk =
  | { alreadyUploaded: true; assetId: string }
  | {
      alreadyUploaded: false;
      url: string;
      headers: Record<string, string>;
    };

export async function subirAsset(
  file: File,
  ownerType: AssetOwnerType,
  ownerId: string,
): Promise<string> {
  if (!(ASSET_MIME_PERMITIDOS as readonly string[]).includes(file.type)) {
    throw new Error("Use JPEG, PNG o WebP");
  }
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const body = {
    ownerType,
    ownerId,
    mime: file.type,
    size: file.size,
    sha256,
  };
  const presign = await api<PresignOk>("/assets/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (presign.alreadyUploaded) return presign.assetId;
  await fetch(presign.url.startsWith("http") ? presign.url : `${apiBase()}${presign.url}`, {
    method: "PUT",
    body: file,
    headers: presign.headers,
    credentials: "include",
  });
  const confirmed = await api<{ id: string }>("/assets/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return confirmed.id;
}

export async function subirComprobanteAbono(
  file: File,
  abonoId: string,
): Promise<string> {
  return subirAsset(file, "abono", abonoId);
}

/** @deprecated Usar subirComprobanteAbono; el id del cobro es el del abono. */
export async function subirComprobantePago(
  file: File,
  pagoId: string,
): Promise<string> {
  return subirComprobanteAbono(file, pagoId);
}

export async function subirFotoCliente(
  file: File,
  clienteId: string,
): Promise<string> {
  return subirAsset(file, "cliente", clienteId);
}

export async function subirFotoProducto(
  file: File,
  productoId: string,
): Promise<string> {
  return subirAsset(file, "producto", productoId);
}

export async function subirComprobanteAbonoPortal(
  token: string,
  file: File,
  abonoId: string,
): Promise<string> {
  if (!(ASSET_MIME_PERMITIDOS as readonly string[]).includes(file.type)) {
    throw new Error("Use JPEG, PNG o WebP");
  }
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const body = {
    ownerType: "abono" as const,
    ownerId: abonoId,
    mime: file.type,
    size: file.size,
    sha256,
  };
  const presign = await api<PresignOk>(
    `/p/${encodeURIComponent(token)}/abonos/assets/presign`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (presign.alreadyUploaded) return presign.assetId;
  await fetch(presign.url.startsWith("http") ? presign.url : `${apiBase()}${presign.url}`, {
    method: "PUT",
    body: file,
    headers: presign.headers,
    credentials: "include",
  });
  const confirmed = await api<{ id: string }>(
    `/p/${encodeURIComponent(token)}/abonos/assets/confirm`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return confirmed.id;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}
