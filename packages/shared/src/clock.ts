export type Clock = {
  now(): Date;
};

/** Reloj de producción. Los tests inyectan un Clock fijo; no usar Date.now() en dominio. */
export const systemClock: Clock = {
  now(): Date {
    return new Date();
  },
};

export function fixedClock(instant: Date): Clock {
  return { now: () => instant };
}
