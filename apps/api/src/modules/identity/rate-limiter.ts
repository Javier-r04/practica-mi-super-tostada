export class LoginRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  consume(key: string, now: Date): boolean {
    const current = this.hits.get(key);
    const ts = now.getTime();
    if (!current || current.resetAt <= ts) {
      this.hits.set(key, { count: 1, resetAt: ts + this.windowMs });
      return true;
    }
    if (current.count >= this.max) return false;
    current.count += 1;
    return true;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}
