import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { envelopeOk } from "@misupertostada/shared";
import { AssetsService } from "./assets.service";
import { CurrentActor } from "../../identity/current-actor";
import type { Actor } from "../../identity/actor";
import { STORAGE_PORT, type StoragePort } from "./storage.port";

@Controller()
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  @Post("assets/presign")
  async presign(@Body() body: unknown) {
    return envelopeOk(await this.assets.presign(body));
  }

  @Post("assets/confirm")
  async confirm(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.assets.confirm(body, actor));
  }

  @Get("assets/:id/url")
  async getViewUrl(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
    @CurrentActor() _actor: Actor,
  ) {
    const apiBase = `${req.protocol}://${req.get("host")}`;
    return envelopeOk({ url: await this.assets.getViewUrl(id, apiBase) });
  }

  @Get("assets/:id")
  @Header("Cache-Control", "private, max-age=3600, stale-while-revalidate=86400")
  async get(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("v") variante: string | undefined,
    @CurrentActor() _actor: Actor,
  ) {
    const v =
      variante === "thumb" || variante === "card" || variante === "full"
        ? variante
        : undefined;
    const { bytes, mime } = await this.assets.getContent(id, v);
    return new StreamableFile(bytes, {
      type: mime,
      disposition: "inline",
    });
  }

  @Put("internal/storage/:key")
  async storagePut(
    @Param("key") key: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const mime = req.headers["content-type"] ?? "application/octet-stream";
    const bytes = req.rawBody
      ? Buffer.from(req.rawBody)
      : await readStream(req);
    await this.storage.put(decodeURIComponent(key), bytes, mime);
    return envelopeOk({ key: decodeURIComponent(key), size: bytes.length });
  }
}

async function readStream(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
