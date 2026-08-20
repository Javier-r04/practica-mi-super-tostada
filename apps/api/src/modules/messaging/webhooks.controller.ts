import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { envelopeOk } from "@misupertostada/shared";
import { Public } from "../shared/public.decorator";
import { WebhookService } from "./webhook.service";

@Public()
@Controller("webhooks/wa")
export class WebhooksController {
  constructor(private readonly webhooks: WebhookService) {}

  @Get()
  @Header("Content-Type", "text/plain")
  verify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") token: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const body = this.webhooks.verify(mode, token, challenge);
    res.status(200).type("text/plain").send(body);
  }

  @Post()
  async receive(
    @Body() body: unknown,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.webhooks.ingest(
      body,
      req.rawBody,
      req.header("x-hub-signature-256"),
    );
    return envelopeOk({ ok: true });
  }
}
