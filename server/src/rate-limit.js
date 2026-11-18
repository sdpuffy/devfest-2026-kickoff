// Fixed-window counters kept in memory. Fine for one server process; use a shared store
// (e.g. Redis) if you run several.

export class RateLimiter {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.windows = new Map();
  }

  window(key) {
    const w = this.windows.get(key);
    if (w && w.resetAt > this.now()) return w;
    if (w) this.windows.delete(key);
    return undefined;
  }

  /** Count one attempt. `ok` is false once the limit is passed. */
  hit(key, max, windowMs) {
    if (this.windows.size > 50_000) this.prune();
    let w = this.window(key);
    if (!w) { w = { count: 0, resetAt: this.now() + windowMs }; this.windows.set(key, w); }
    w.count++;
    return { ok: w.count <= max, retryAfter: Math.ceil((w.resetAt - this.now()) / 1000) };
  }

  /** True while fewer than `max` attempts were counted (doesn't count this one). */
  allowed(key, max) {
    return (this.window(key)?.count ?? 0) < max;
  }

  retryAfter(key) {
    const w = this.window(key);
    return w ? Math.ceil((w.resetAt - this.now()) / 1000) : 0;
  }

  reset(key) {
    this.windows.delete(key);
  }

  prune() {
    const t = this.now();
    for (const [key, w] of this.windows) if (w.resetAt <= t) this.windows.delete(key);
  }
}
