import { api } from "@/lib/api";

type PresignOk =
  | { alreadyUploaded: true; assetId: string }
  | {
      alreadyUploaded: false;
      url: string;
      headers: Record<string, string>;
    };

export async function subirComprobantePago(
  file: File,
  pagoId: string,
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use JPEG, PNG o WebP");
  }
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const body = {
    ownerType: "pago" as const,
    ownerId: pagoId,
    mime: file.type,
    size: file.size,
    sha256,
  };
  const presign = await api<PresignOk>("/assets/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (presign.alreadyUploaded) return presign.assetId;
  await fetch(presign.url, {
    method: "PUT",
    body: file,
    headers: presign.headers,
  });
  const confirmed = await api<{ id: string }>("/assets/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return confirmed.id;
}
