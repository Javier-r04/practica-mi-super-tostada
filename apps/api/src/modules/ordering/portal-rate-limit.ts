import { Injectable } from "@nestjs/common";
import { DomainException } from "../shared/domain.exception";
import { SlidingWindowRateLimiter } from "../shared/rate-limit";
import { MENSAJE_LIMITE_TASA } from "@misupertostada/shared";

/** Portal: 60/min por IP, 30/min por hash. Assets: 120/min (thumbs del catálogo). Sin Redis. */
@Injectable()
export class PortalRateLimit {
  constructor(
    private readonly porIp: SlidingWindowRateLimiter,
    private readonly porHash: SlidingWindowRateLimiter,
    private readonly assetsPorIp: SlidingWindowRateLimiter,
    private readonly assetsPorHash: SlidingWindowRateLimiter,
  ) {}

  consume(ip: string, tokenHash: string, now: Date): void {
    if (
      !this.porIp.consume(`ip:${ip}`, now) ||
      !this.porHash.consume(`hash:${tokenHash}`, now)
    ) {
      throw new DomainException("LIMITE_TASA", MENSAJE_LIMITE_TASA, 429);
    }
  }

  consumeAsset(ip: string, tokenHash: string, now: Date): void {
    if (
      !this.assetsPorIp.consume(`asset-ip:${ip}`, now) ||
      !this.assetsPorHash.consume(`asset-hash:${tokenHash}`, now)
    ) {
      throw new DomainException("LIMITE_TASA", MENSAJE_LIMITE_TASA, 429);
    }
  }
}

export function portalRateLimitDefault(): PortalRateLimit {
  return new PortalRateLimit(
    new SlidingWindowRateLimiter(60, 60_000),
    new SlidingWindowRateLimiter(30, 60_000),
    new SlidingWindowRateLimiter(120, 60_000),
    new SlidingWindowRateLimiter(120, 60_000),
  );
}
