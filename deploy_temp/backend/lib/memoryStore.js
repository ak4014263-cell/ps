/**
 * In-Memory Rate Limiter Store
 * Simple fallback when Redis unavailable
 */
export class MemoryStore {
  constructor(options = {}) {
    this.hits = new Map();
    this.resets = new Map();
    this.windowMs = options.windowMs || 60000; // Default 1 minute
  }

  incr(key, cb) {
    const now = Date.now();
    const reset = this.resets.get(key);

    if (!reset || now > reset) {
      // New window
      const resetTime = new Date(now + this.windowMs);
      this.hits.set(key, 1);
      this.resets.set(key, resetTime);
      cb(null, 1, resetTime);
    } else {
      // Increment existing
      const count = (this.hits.get(key) || 0) + 1;
      this.hits.set(key, count);
      cb(null, count, this.resets.get(key));
    }
  }

  resetKey(key, cb) {
    this.hits.delete(key);
    this.resets.delete(key);
    cb?.();
  }

  decrement(key, cb) {
    const count = Math.max(0, (this.hits.get(key) || 0) - 1);
    this.hits.set(key, count);
    cb?.(null, count);
  }
}
