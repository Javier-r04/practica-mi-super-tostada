import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Put,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { envelopeOk } from "@misupertostada/shared";
import { AssetsService } from "./assets.service";
import { CurrentActor } from "../../identity/current-actor";
import type { Actor } from "../../identity/actor";
import { STORAGE_PORT, type StoragePort } from "./storage.port";
import { FakeStorageAdapter } from "./fake.storage";
import { DomainException } from "../domain.exception";

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

  @Put("internal/storage/:key")
  async fakePut(
    @Param("key") key: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!(this.storage instanceof FakeStorageAdapter)) {
      throw new DomainException(
        "NO_DISPONIBLE",
        "Storage local no está activo",
        404,
      );
    }
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
