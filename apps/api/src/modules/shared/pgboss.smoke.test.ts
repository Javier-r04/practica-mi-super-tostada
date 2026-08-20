import { describe, expect, test } from "bun:test";
import { PgBoss } from "pg-boss";
import { postgresListo, testDatabaseUrl } from "../../test/db";

const listo = await postgresListo();

describe.skipIf(!listo)("pg-boss sobre Postgres", () => {
  test("start / send / work / stop no duplica el singletonKey", async () => {
    const boss = new PgBoss({
      connectionString: testDatabaseUrl(),
      schema: "pgboss",
      max: 1,
      application_name: "misupertostada-boss-test",
    });
    const queue = `test.smoke.${crypto.randomUUID()}`;
    const seen: string[] = [];

    try {
      await boss.start();
      await boss.createQueue(queue, { retryLimit: 2, policy: "exclusive" });
      const key = crypto.randomUUID();
      const first = await boss.send(queue, { n: 1 }, { singletonKey: key });
      const second = await boss.send(queue, { n: 2 }, { singletonKey: key });
      expect(first).toBeTruthy();
      expect(second).toBeNull();

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout work")), 8_000);
        void boss.work<{ n: number }>(queue, async ([job]) => {
          if (!job) return;
          seen.push(job.data.n.toString());
          clearTimeout(timer);
          resolve();
        });
      });

      expect(seen).toEqual(["1"]);
    } finally {
      await boss.stop({ graceful: false, timeout: 3_000 });
    }
  });
});
