import { afterAll } from "bun:test";
import { purgarOrgsDeLaCorrida } from "./db";

/**
 * Limpieza global de la suite. Bun aplica los hooks de un preload a todos los
 * archivos de test, así que este `afterAll` corre una sola vez al final.
 *
 * Los e2e crean una organización por test y no truncan nada —su aislamiento es
 * el UUID del nombre—, así que sin esto cada corrida deja cientos de
 * organizaciones muertas. Con `bun test --watch` en `dev-all.ts`, eso son
 * cientos por cada guardado.
 */
afterAll(async () => {
  await purgarOrgsDeLaCorrida();
});
