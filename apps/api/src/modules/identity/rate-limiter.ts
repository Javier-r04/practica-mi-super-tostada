import { SlidingWindowRateLimiter } from "../shared/rate-limit";

export class LoginRateLimiter extends SlidingWindowRateLimiter {
  constructor(max = 5, windowMs = 15 * 60 * 1000) {
    super(max, windowMs);
  }
}
