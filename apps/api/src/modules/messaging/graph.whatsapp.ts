import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env";
import { DomainException } from "../shared/domain.exception";
import type {
  GraphPlantilla,
  SendTemplateInput,
  WhatsAppPort,
  WhatsAppSendResult,
} from "./whatsapp.port";

export function verificarFirmaMeta(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type Auth = { accessToken: string; phoneNumberId: string; wabaId: string };

@Injectable()
export class GraphWhatsAppAdapter implements WhatsAppPort {
  private auth: Auth | null = null;

  bind(auth: Auth): WhatsAppPort {
    const next = new GraphWhatsAppAdapter();
    next.auth = auth;
    return next;
  }

  async sendText(input: { to: string; body: string }): Promise<WhatsAppSendResult> {
    const auth = this.requireAuth();
    const env = loadEnv();
    const json = await graphPost(
      env.META_GRAPH_VERSION,
      `${auth.phoneNumberId}/messages`,
      auth.accessToken,
      {
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: { body: input.body },
      },
    );
    return { waMessageId: String(json.messages?.[0]?.id ?? "") };
  }

  async sendTemplate(input: SendTemplateInput): Promise<WhatsAppSendResult> {
    const auth = this.requireAuth();
    const env = loadEnv();
    const components: unknown[] = [];
    if (input.headerDocumentId) {
      components.push({
        type: "header",
        parameters: [
          { type: "document", document: { id: input.headerDocumentId } },
        ],
      });
    }
    if (input.bodyParams.length) {
      components.push({
        type: "body",
        parameters: input.bodyParams.map((text) => ({ type: "text", text })),
      });
    }
    if (input.buttonParams?.length) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: input.buttonParams.map((text) => ({ type: "text", text })),
      });
    }
    const json = await graphPost(
      env.META_GRAPH_VERSION,
      `${auth.phoneNumberId}/messages`,
      auth.accessToken,
      {
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: input.name,
          language: { code: input.language },
          components,
        },
      },
    );
    return { waMessageId: String(json.messages?.[0]?.id ?? "") };
  }

  async uploadDocument(input: {
    bytes: Buffer;
    mime: string;
    filename: string;
  }): Promise<{ mediaId: string }> {
    const auth = this.requireAuth();
    const env = loadEnv();
    const form = new FormData();
    form.set("messaging_product", "whatsapp");
    form.set("type", input.mime);
    form.set("file", new Blob([new Uint8Array(input.bytes)], { type: input.mime }), input.filename);
    const res = await fetch(
      `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${auth.phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        body: form,
      },
    );
    const json = (await res.json()) as { id?: string; error?: { message?: string; code?: number } };
    if (!res.ok) {
      throw new DomainException(
        "WHATSAPP",
        json.error?.message ?? "No se pudo subir el documento a Meta",
        502,
      );
    }
    return { mediaId: String(json.id) };
  }

  async syncTemplates(input: {
    wabaId: string;
    accessToken: string;
  }): Promise<GraphPlantilla[]> {
    const env = loadEnv();
    const url = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${input.wabaId}/message_templates?limit=250`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const json = (await res.json()) as {
      data?: Array<{
        name: string;
        language: string;
        status: string;
        category: string;
        components?: unknown;
      }>;
    };
    if (!res.ok) {
      throw new DomainException("WHATSAPP", "No se pudieron sincronizar las plantillas", 502);
    }
    return (json.data ?? []).map((row) => ({
      name: row.name,
      language: row.language,
      status: row.status,
      category: row.category,
      componentes: row.components ?? [],
    }));
  }

  async subscribeWaba(input: {
    wabaId: string;
    accessToken: string;
  }): Promise<void> {
    const env = loadEnv();
    await graphPost(
      env.META_GRAPH_VERSION,
      `${input.wabaId}/subscribed_apps`,
      input.accessToken,
      {},
    );
  }

  private requireAuth(): Auth {
    if (!this.auth) {
      throw new DomainException(
        "NO_DISPONIBLE",
        "WhatsApp no está conectado",
        409,
      );
    }
    return this.auth;
  }
}

async function graphPost(
  version: string,
  path: string,
  token: string,
  body: unknown,
): Promise<{ messages?: Array<{ id: string }>; error?: { message?: string; code?: number } }> {
  const res = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    const code = json.error?.code === 131047 ? "VENTANA_WA_CERRADA" : "WHATSAPP";
    throw new DomainException(
      code,
      json.error?.message ?? "Error de WhatsApp",
      code === "VENTANA_WA_CERRADA" ? 409 : 502,
    );
  }
  return json;
}
