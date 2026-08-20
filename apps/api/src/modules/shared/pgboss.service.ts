import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { PgBoss } from "pg-boss";
import { loadEnv } from "../../config/env";
import { OutboxProcessor } from "./outbox.processor";
import { AssetVariantsJob } from "./storage/variants.job";

export const COLA_OUTBOX_DESPACHAR = "outbox.despachar";
export const COLA_ASSET_VARIANTES = "asset.variantes";

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;
  private drainTimer: ReturnType<typeof setInterval> | null = null;
  private intervalTimers: ReturnType<typeof setInterval>[] = [];

  constructor(
    private readonly processor: OutboxProcessor,
    private readonly variants: AssetVariantsJob,
  ) {}

  async onModuleInit(): Promise<void> {
    const env = loadEnv();
    this.boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: "pgboss",
      max: 2,
      application_name: "misupertostada-boss",
    });
    this.boss.on("error", (err) => {
      this.logger.error(err instanceof Error ? err.message : "pg-boss error");
    });
    await this.boss.start();
    await this.boss.createQueue(COLA_OUTBOX_DESPACHAR, {
      policy: "exclusive",
      retryLimit: 8,
      retryDelay: 15,
      retryBackoff: true,
    });
    await this.boss.createQueue(COLA_ASSET_VARIANTES, {
      policy: "exclusive",
      retryLimit: 5,
      retryDelay: 10,
      retryBackoff: true,
    });

    await this.boss.work<{ id: string }>(
      COLA_OUTBOX_DESPACHAR,
      async ([job]) => {
        if (!job) return;
        const result = await this.processor.processRow(job.data.id);
        if (result === "fallo" || result === "error") {
          throw new Error(`outbox ${job.data.id} ${result}`);
        }
      },
    );

    await this.boss.work<{ assetId: string }>(
      COLA_ASSET_VARIANTES,
      async ([job]) => {
        if (!job) return;
        await this.variants.generate(job.data.assetId);
      },
    );

    await this.drain();
    this.drainTimer = setInterval(() => {
      void this.drain();
    }, 10_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.drainTimer) clearInterval(this.drainTimer);
    for (const t of this.intervalTimers) clearInterval(t);
    if (this.boss) await this.boss.stop({ graceful: false, timeout: 5_000 });
  }

  async enqueueDespacho(outboxId: string): Promise<void> {
    if (!this.boss) return;
    await this.boss.send(
      COLA_OUTBOX_DESPACHAR,
      { id: outboxId },
      { singletonKey: outboxId },
    );
  }

  async enqueueVariantes(assetId: string): Promise<void> {
    if (!this.boss) return;
    await this.boss.send(
      COLA_ASSET_VARIANTES,
      { assetId },
      { singletonKey: assetId },
    );
  }

  async registerIntervalJob(
    queue: string,
    everyMs: number,
    handler: () => Promise<void>,
  ): Promise<void> {
    if (!this.boss) return;
    await this.boss.createQueue(queue, {
      policy: "exclusive",
      retryLimit: 3,
      retryDelay: 15,
      retryBackoff: true,
    });
    await this.boss.work(queue, async () => {
      await handler();
    });
    const timer = setInterval(() => {
      void this.boss?.send(queue, {}, { singletonKey: queue });
    }, everyMs);
    this.intervalTimers.push(timer);
    void this.boss.send(queue, {}, { singletonKey: queue });
  }

  async drain(): Promise<void> {
    if (!this.boss) return;
    try {
      const ids = await this.processor.idsPendientes();
      for (const id of ids) {
        await this.enqueueDespacho(id);
      }
    } catch (err) {
      this.logger.error(
        err instanceof Error ? err.message : "fallo drenando outbox",
      );
    }
  }
}
